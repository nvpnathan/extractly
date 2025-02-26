from pydantic import BaseModel
from typing import Dict, Any, Optional


class ProjectSettings(BaseModel):
    id: str
    name: str
    classifier_id: Optional[Dict[str, Any]] = None
    extractor_ids: Optional[Dict[str, Dict[str, str]]] = None


class Settings(BaseModel):
    validate_classification: bool
    validate_extraction: bool
    validate_extraction_later: bool
    perform_classification: bool
    perform_extraction: bool
    project: ProjectSettings
