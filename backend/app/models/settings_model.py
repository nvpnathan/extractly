from pydantic import BaseModel
from typing import Dict, Optional, List


class ClassifierSettings(BaseModel):
    id: str
    name: str
    resourceType: str
    status: str
    documentTypeIds: List[str]
    detailsUrl: str
    syncUrl: str
    asyncUrl: str
    properties: List[dict]


class ProjectSettings(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    classifier_id: Optional[ClassifierSettings] = None
    extractor_ids: Optional[Dict[str, Dict[str, str]]] = None


class Settings(BaseModel):
    # Make all fields optional with defaults to match original dataclass behavior
    validate_classification: bool = False
    validate_extraction: bool = False
    validate_extraction_later: bool = False
    perform_classification: bool = False
    perform_extraction: bool = False
    project: ProjectSettings = ProjectSettings()
