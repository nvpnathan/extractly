import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Tuple
from utils.write_results import WriteResults
from config.project_setup import load_prompts, initialize_environment
from api.discovery_routes import SettingsManager
from models.settings_model import Settings

logging.basicConfig(level=logging.INFO)


class DocumentProcessor:
    def __init__(
        self, digitize_client, classify_client, extract_client, validate_client
    ):
        self.digitize_client = digitize_client
        self.classify_client = classify_client
        self.extract_client = extract_client
        self.validate_client = validate_client
        self.executor = ThreadPoolExecutor()
        self.documents_status = {}

    def process_document(self, document_id: str, document_path: str, config: Settings):
        """Process a single document."""
        try:
            self.documents_status[document_id] = "Digitizing"
            doc_id = self.digitize_client.digitize(document_path)

            document_type_id = None
            if config.perform_classification:
                self.documents_status[document_id] = "Classifying"
                document_type_id = self.classify_document(doc_id, document_path, config)

            if config.perform_extraction:
                self.documents_status[document_id] = "Extracting"
                extractor_id, extractor_name = self.get_extractor(
                    config, document_type_id
                )
                if extractor_id and extractor_name:
                    self.perform_extraction(
                        doc_id, document_path, extractor_id, extractor_name, config
                    )

            self.documents_status[document_id] = "Completed"
        except Exception as e:
            logging.error(f"Error processing {document_path}: {e}", exc_info=True)
            self.documents_status[document_id] = "Failed"

    def classify_document(
        self, document_id: str, document_path: str, config: Settings
    ) -> Optional[str]:
        prompts = (
            load_prompts("classification")
            if config.project.classifier_id
            and config.project.classifier_id.id == "generative_classifier"
            else None
        )
        try:
            return self.classify_client.classify_document(
                document_path,
                document_id,
                config.project.classifier_id.id
                if config.project.classifier_id
                else None,
                prompts,
                config.validate_classification,
            )
        except Exception as e:
            logging.error(f"Classification failed for {document_id}: {e}")
            return None

    def get_extractor(
        self, config: Settings, document_type_id: Optional[str]
    ) -> Tuple[Optional[str], Optional[str]]:
        extractor = (
            config.project.extractor_ids.get(document_type_id, {})
            if document_type_id and config.project.extractor_ids
            else next(iter(config.project.extractor_ids.values()), {})
            if config.project.extractor_ids
            else {}
        )
        return extractor.get("id"), extractor.get("name")

    def perform_extraction(
        self,
        document_id: str,
        document_path: str,
        extractor_id: str,
        extractor_name: str,
        config: Settings,
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

    def write_extraction_results(self, extraction_results, document_path: str):
        WriteResults(
            document_path=document_path, extraction_results=extraction_results
        ).write_results()

    def write_validated_results(
        self, validated_results, extraction_results, document_path: str
    ):
        WriteResults(
            document_path=document_path,
            extraction_results=extraction_results,
            validation_extraction_results=validated_results,
        ).write_results()


# Singleton instance of DocumentProcessor
_document_processor: Optional[DocumentProcessor] = None


def initialize_processor_with_settings():
    """Initialize settings and document processor together."""
    global _document_processor
    if _document_processor is None:
        # Ensure settings are loaded first
        SettingsManager.load_cache_from_file()  # This populates SettingsManager

        # Initialize clients with the loaded settings
        clients = initialize_environment()
        digitize_client, classify_client, extract_client, validate_client = clients
        _document_processor = DocumentProcessor(
            digitize_client, classify_client, extract_client, validate_client
        )
    return _document_processor


def get_document_processor() -> DocumentProcessor:
    """Get the initialized document processor, initializing if necessary."""
    global _document_processor
    if _document_processor is None:
        initialize_processor_with_settings()
    return _document_processor
