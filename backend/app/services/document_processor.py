from fastapi import APIRouter, BackgroundTasks, WebSocket, WebSocketDisconnect
import os
import json
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from utils.write_results import WriteResults
from config.project_setup import load_prompts, initialize_environment
from api.discovery_routes import get_settings_instance
from database.db_utils import get_filenames_processing, fetch_document_statuses

# Initialize FastAPI router
router = APIRouter()
logging.basicConfig(level=logging.INFO)

documents_status = {}
executor = ThreadPoolExecutor()

# Global clients and document processor
clients = None
document_processor = None


def ensure_clients_initialized():
    """Ensure clients are initialized before processing requests."""
    global clients, document_processor

    if clients is None or document_processor is None:
        setup_clients(get_settings_instance())


class DocumentProcessor:
    def __init__(
        self, digitize_client, classify_client, extract_client, validate_client
    ):
        self.digitize_client = digitize_client
        self.classify_client = classify_client
        self.extract_client = extract_client
        self.validate_client = validate_client

    def process_document(self, document_id: str, document_path: str, config):
        try:
            documents_status[document_id] = "Digitizing"
            doc_id = self.digitize_client.digitize(document_path)

            document_type_id = None
            if config.perform_classification:
                documents_status[document_id] = "Classifying"
                document_type_id = self.classify_document(doc_id, document_path, config)

            if config.perform_extraction:
                documents_status[document_id] = "Extracting"
                extractor_id, extractor_name = self.get_extractor(
                    config, document_type_id
                )
                if extractor_id and extractor_name:
                    self.perform_extraction(
                        doc_id, document_path, extractor_id, extractor_name, config
                    )

            documents_status[document_id] = "Completed"
        except Exception as e:
            logging.error(f"Error processing {document_path}: {e}", exc_info=True)
            documents_status[document_id] = "Failed"

    def classify_document(self, document_id: str, document_path: str, config):
        prompts = (
            load_prompts("classification")
            if config.project.classifier_id.id == "generative_classifier"
            else None
        )
        try:
            return self.classify_client.classify_document(
                document_path,
                document_id,
                config.project.classifier_id.id,
                prompts,
                config.validate_classification,
            )
        except Exception as e:
            logging.error(f"Classification failed for {document_id}: {e}")
            return None

    def get_extractor(self, config, document_type_id: str):
        extractor = (
            config.project.extractor_ids.get(document_type_id, {})
            if document_type_id
            else next(iter(config.project.extractor_ids.values()), {})
        )
        return extractor.get("id"), extractor.get("name")

    def perform_extraction(
        self,
        document_id: str,
        document_path: str,
        extractor_id: str,
        extractor_name: str,
        config,
    ):
        prompts = (
            load_prompts(extractor_name)
            if config.project.id == "00000000-0000-0000-0000-000000000001"
            else None
        )
        extraction_results = self.extract_client.extract_document(
            extractor_id, document_id, prompts
        )
        self.write_extraction_results(extraction_results, document_path)
        if config.validate_extraction:
            validated_results = self.validate_client.validate_extraction_results(
                extractor_id, document_id, extraction_results, prompts
            )
            self.write_validated_results(
                validated_results, extraction_results, document_path
            )

    def write_extraction_results(self, extraction_results, document_path):
        WriteResults(
            document_path=document_path, extraction_results=extraction_results
        ).write_results()

    def write_validated_results(
        self, validated_results, extraction_results, document_path
    ):
        WriteResults(
            document_path=document_path,
            extraction_results=extraction_results,
            validation_extraction_results=validated_results,
        ).write_results()


def setup_clients(config=None):
    """Initialize clients and document processor with updated settings."""
    global clients, document_processor

    if (
        clients is None or document_processor is None
    ):  # Ensure re-initialization is needed
        clients = initialize_environment()
        digitize_client, classify_client, extract_client, validate_client = clients
        document_processor = DocumentProcessor(
            digitize_client, classify_client, extract_client, validate_client
        )


# Ensure document processor is initialized
setup_clients(get_settings_instance())

# Store active WebSocket connections
active_connections = set()


@router.post("/process/")
def process_documents(background_tasks: BackgroundTasks):
    """API endpoint to process uploaded documents."""
    ensure_clients_initialized()  # Ensure clients are set before proceeding

    if document_processor is None:
        return {"error": "Clients not initialized. Complete the UI wizard first."}

    config = get_settings_instance()
    filenames = get_filenames_processing()

    if not filenames:
        return {"error": "No documents found for processing."}

    processed_files = []

    for (filename,) in filenames:
        document_id = filename.rsplit(".", 1)[0]  # Remove file extension
        documents_status[document_id] = "Uploaded"
        document_path = os.path.join("cache/documents/", filename)

        background_tasks.add_task(
            document_processor.process_document,
            document_id,
            document_path,
            config,  # Pass updated settings
        )

        documents_status[document_id] = "Processing"
        processed_files.append(filename)

    return {"message": "Processing started", "processed_files": processed_files}


@router.websocket("/ws/status/")
async def websocket_status_endpoint(websocket: WebSocket):
    """WebSocket to send real-time document processing updates."""
    await websocket.accept()
    active_connections.add(websocket)

    try:
        while True:
            # Fetch latest document statuses
            document_statuses = await fetch_document_statuses()
            status_update = json.dumps({"documents": document_statuses})

            # Send update to all connected clients
            for connection in active_connections:
                await connection.send_text(status_update)

            await asyncio.sleep(2)  # Send updates every 2 seconds

    except WebSocketDisconnect:
        active_connections.remove(websocket)
