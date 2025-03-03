import os
import shutil
from typing import List
from fastapi import APIRouter, UploadFile, File
from config.project_config import BASE_URL
from api.auth import initialize_authentication
from database.db_utils import update_cache

# Initialize authentication
auth = initialize_authentication()


def get_bearer_token():
    """Returns the latest valid bearer token."""
    return auth.get_bearer_token()


base_url = BASE_URL

router = APIRouter()


# # Upload files
# @router.post("/upload")
# async def upload_files(files: UploadFile = File(...)):
#     """Upload files to the server."""
#     file_location = f"cache/documents/{files.filename}"
#     with open(file_location, "wb") as file_object:
#         file_object.write(files.file.read())
#     return {"info": f"file '{files.filename}' saved at '{file_location}'"}


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
        for filename in os.listdir("cache/documents/")
        if filename.lower().endswith((".png", ".jpg", ".jpeg", ".pdf", ".tif"))
    ]
    return {"files": files}
