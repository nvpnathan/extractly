from pydantic import BaseModel
from typing import Dict, Optional, List


class ClassifierSettings(BaseModel):
    id: str
    name: str
    resourceType: str
    status: str
    documentTypeIds: List
    detailsUrl: str
    syncUrl: str
    asyncUrl: str
    properties: List


class ProjectSettings(BaseModel):
    id: str
    name: str
    classifier: Optional[ClassifierSettings] = None
    extractor_ids: Optional[Dict[str, Dict[str, str]]] = None


class Settings(BaseModel):
    validate_classification: bool
    validate_extraction: bool
    validate_extraction_later: bool
    perform_classification: bool
    perform_extraction: bool
    project: ProjectSettings
