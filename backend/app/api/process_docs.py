import os
import json
import asyncio
import shutil
from typing import List
from fastapi import (
    APIRouter,
    UploadFile,
    File,
    BackgroundTasks,
    WebSocket,
    WebSocketDisconnect,
)
from api.auth import initialize_authentication
from database.db_utils import (
    update_cache,
    get_filenames_processing,
    fetch_document_statuses,
)
from services.document_processor import get_document_processor
from config.project_config import CACHE_DIR
from api.discovery_routes import SettingsManager
from models.settings_model import Settings

# Initialize authentication
auth = initialize_authentication()


def get_bearer_token():
    """Returns the latest valid bearer token."""
    return auth.get_bearer_token()


router = APIRouter()


@router.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    uploaded_files = []
    upload_dir = "cache/documents/"
    os.makedirs(upload_dir, exist_ok=True)

    for file in files:
        if file.filename.lower().endswith((".png", ".jpg", ".jpeg", ".pdf", ".tif")):
            file_path = os.path.join(upload_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            update_cache(filename=file.filename, document_id=None, stage="uploaded")
            uploaded_files.append(file.filename)
    return {"uploaded_files": uploaded_files}


# Get all files
@router.get("/files")
async def get_files():
    """Get all files from the server."""
    files = [
        filename
        for filename in os.listdir(f"{CACHE_DIR}/documents/")
        if filename.lower().endswith((".png", ".jpg", ".jpeg", ".pdf", ".tif"))
    ] or None  # Returns None if the list is empty
    return {"files": files}


@router.post("/process/")
def process_documents(background_tasks: BackgroundTasks):
    """API endpoint to process uploaded documents."""
    processor = (
        get_document_processor()
    )  # This ensures settings and processor are initialized
    config: Settings = SettingsManager.get_settings()
    filenames = get_filenames_processing()

    if not filenames:
        return {"error": "No documents found for processing."}

    processed_files = []

    for (filename,) in filenames:
        document_id = filename.rsplit(".", 1)[0]
        document_path = os.path.join(f"{CACHE_DIR}/documents/", filename)

        background_tasks.add_task(
            processor.process_document,
            document_id,
            document_path,
            config,
        )

        processed_files.append(filename)

    return {"message": "Processing started", "processed_files": processed_files}


# Store active WebSocket connections
active_connections = set()


@router.websocket("/ws/status/")
async def websocket_status_endpoint(websocket: WebSocket):
    """WebSocket to send real-time document processing updates."""
    await websocket.accept()
    active_connections.add(websocket)

    try:
        while True:
            document_statuses = await fetch_document_statuses()
            status_update = json.dumps({"documents": document_statuses})

            for connection in active_connections:
                await connection.send_text(status_update)

            await asyncio.sleep(2)
    except WebSocketDisconnect:
        active_connections.remove(websocket)
