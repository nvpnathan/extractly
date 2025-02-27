from fastapi import APIRouter, HTTPException
from models.settings_model import Settings, ProjectSettings
from dataclasses import dataclass, asdict, field
import os
import json
import requests
from config.project_config import CACHE_DIR, CACHE_FILE
from config.project_config import BASE_URL
from api.auth import initialize_authentication

# Initialize authentication
auth = initialize_authentication()


def get_bearer_token():
    """Returns the latest valid bearer token."""
    return auth.get_bearer_token()


base_url = BASE_URL

router = APIRouter()


@dataclass
class ProcessingConfig:
    """Data class to store application settings."""

    validate_classification: bool = False
    validate_extraction: bool = False
    validate_extraction_later: bool = False
    perform_classification: bool = False
    perform_extraction: bool = False
    project: ProjectSettings = field(default_factory=dict)


# Global settings instance
settings_cache = ProcessingConfig()


def ensure_cache_directory():
    """Ensure the cache directory exists."""
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)


def save_cache_to_file():
    """Save the current settings to a JSON file."""
    ensure_cache_directory()
    with open(CACHE_FILE, "w", encoding="utf-8") as cache_file:
        json.dump(asdict(settings_cache), cache_file, indent=4)


def load_cache_from_file():
    """Load settings from a JSON file if it exists."""
    global settings_cache
    settings_cache = ProcessingConfig()

    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r", encoding="utf-8") as cache_file:
            data = json.load(cache_file)

            # Update the settings dataclass with loaded values
            for key, value in data.items():
                if hasattr(settings_cache, key):
                    setattr(settings_cache, key, value)


# Load settings on module initialization
load_cache_from_file()


@router.get("/settings")
def get_settings():
    """Retrieve stored settings from the dataclass."""
    return settings_cache


@router.post("/settings")
def update_settings(settings: Settings):
    """Update user settings in the dataclass and save to cache file."""
    global settings_cache  # Ensure we modify the global instance

    settings_dict = settings.model_dump()
    for key, value in settings_dict.items():
        if hasattr(settings_cache, key):
            setattr(settings_cache, key, value)

    save_cache_to_file()
    return {"message": "Settings updated successfully."}


@router.get("/projects")
def get_projects():
    """Retrieve projects from API."""
    api_url = f"{base_url}?api-version=1.1"
    headers = {
        "Authorization": f"Bearer {get_bearer_token()}",
        "accept": "application/json",
    }

    try:
        response = requests.get(api_url, headers=headers, timeout=300)
        response.raise_for_status()
        data = response.json()

        if not data.get("projects"):
            raise HTTPException(status_code=404, detail="No projects found.")

        return data["projects"]
    except requests.RequestException as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching projects: {str(e)}"
        )


@router.get("/project/{project_id}/classifiers")
def get_classifiers(project_id: str):
    """Retrieve classifiers from API."""
    api_url = f"{base_url}/{project_id}/classifiers?api-version=1.1"
    headers = {
        "Authorization": f"Bearer {get_bearer_token()}",
        "accept": "application/json",
    }

    try:
        response = requests.get(api_url, headers=headers, timeout=300)
        response.raise_for_status()
        data = response.json()

        if not data.get("classifiers"):
            raise HTTPException(status_code=404, detail="No classifiers found.")

        return data["classifiers"]
    except requests.RequestException as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching classifiers: {str(e)}"
        )


@router.get("/project/{project_id}/extractors")
def get_extractors(project_id: str):
    """Retrieve extractors from API."""
    api_url = f"{base_url}/{project_id}/extractors?api-version=1.1"
    headers = {
        "Authorization": f"Bearer {get_bearer_token()}",
        "accept": "application/json",
    }

    try:
        response = requests.get(api_url, headers=headers, timeout=300)
        response.raise_for_status()
        data = response.json()

        if not data.get("extractors"):
            raise HTTPException(status_code=404, detail="No extractors found.")

        return data["extractors"]
    except requests.RequestException as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching extractors: {str(e)}"
        )


# Export the settings dataclass to make it accessible to other modules
def get_settings_instance() -> ProcessingConfig:
    """Return the current settings instance for use in other modules."""
    return settings_cache
