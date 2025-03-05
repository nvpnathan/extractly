import os
import json
import sqlite3
from dotenv import load_dotenv
from services.digitize import Digitize
from services.classify import Classify
from services.extract import Extract
from services.validate import Validate
from api.discovery_routes import get_settings_instance
from api.auth import initialize_authentication
from config.project_config import BASE_URL, CACHE_DIR, SQLITE_DB_PATH


# Load environment variables
load_dotenv()

base_url = BASE_URL

# Initialize Authentication
auth = initialize_authentication()


def get_bearer_token():
    """Returns the latest valid bearer token."""
    return auth.get_bearer_token()


def ensure_cache_directory():
    """Ensure the cache directory exists."""
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)


def ensure_database():
    """Ensure the SQLite database and required tables exist."""
    ensure_cache_directory()

    # Check if the database file exists
    if not os.path.exists(SQLITE_DB_PATH):
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()

        # Create documents table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                document_id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                stage TEXT NOT NULL,
                digitization_operation_id TEXT,
                classification_operation_id TEXT,
                classification_validation_operation_id TEXT,
                extraction_operation_id TEXT,
                extraction_validation_operation_id TEXT,
                digitization_duration REAL,
                classification_duration REAL,
                classification_validation_duration REAL,
                extraction_duration REAL,
                extraction_validation_duration REAL,
                project_id TEXT,
                classifier_id TEXT,
                extractor_id TEXT,
                error_code TEXT,
                error_message TEXT,
                timestamp REAL NOT NULL
            )
        """)

        # Create classification table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS classification (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                document_type_id TEXT NOT NULL,
                classification_confidence REAL NOT NULL,
                start_page INTEGER NOT NULL,
                page_count INTEGER NOT NULL,
                classifier_name TEXT NOT NULL,
                operation_id TEXT NOT NULL
            )
        """)

        # Create extraction table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS extraction (
                filename TEXT NOT NULL,
                document_id TEXT NOT NULL,
                document_type_id TEXT NOT NULL,
                field_id TEXT,
                field TEXT,
                is_missing BOOLEAN,
                field_value TEXT,
                field_unformatted_value TEXT,
                validated_field_value TEXT,
                is_correct BOOLEAN,
                confidence REAL,
                ocr_confidence REAL,
                operator_confirmed BOOLEAN,
                row_index INTEGER DEFAULT -1,
                column_index INTEGER DEFAULT -1,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (filename, field_id, field, row_index, column_index)
            )
        """)

        conn.commit()
        conn.close()


# Function to initialize clients
def initialize_clients(base_url: str, bearer_token: str):
    config = get_settings_instance()
    digitize_client = Digitize(base_url, config.project.id, bearer_token)
    classify_client = Classify(base_url, config.project.id, bearer_token)
    extract_client = Extract(base_url, config.project.id, bearer_token)
    validate_client = Validate(base_url, config.project.id, bearer_token)

    return digitize_client, classify_client, extract_client, validate_client


def load_prompts(document_type_id: str) -> dict | None:
    """Load prompts from a JSON file based on the document type ID."""
    prompts_directory = "generative_prompts"
    prompts_file = os.path.join(prompts_directory, f"{document_type_id}_prompts.json")
    if os.path.exists(prompts_file):
        with open(prompts_file, "r", encoding="utf-8") as file:
            return json.load(file)
    else:
        print(f"Error: File '{prompts_file}' not found.")
        return None


def initialize_environment():
    """Initialize the processing environment."""
    # Load environment variables
    load_dotenv()

    # initialize_clients(base_url=base_url, bearer_token=get_bearer_token())

    # Ensure database exists
    ensure_database()
