import os
import json
import requests
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from models.settings_model import Settings
from config.project_config import CACHE_DIR, CACHE_FILE, BASE_URL
from api.auth import initialize_authentication

# Initialize authentication
auth = initialize_authentication()


def get_bearer_token():
    """Returns the latest valid bearer token."""
    return auth.get_bearer_token()


base_url = BASE_URL

router = APIRouter()


def ensure_cache_directory():
    """Ensure the cache directory exists."""
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)


class SettingsManager:
    """Manages the Settings instance across the application."""

    _instance: Optional[Settings] = None

    @classmethod
    def get_settings(cls) -> Settings:
        """Get the settings instance, trying to load from cache file first."""
        # If we haven't loaded settings yet, try the cache file
        if cls._instance is None:
            if os.path.exists(CACHE_FILE):
                try:
                    with open(CACHE_FILE, "r", encoding="utf-8") as f:
                        json_str = f.read()
                        cls._instance = Settings.model_validate_json(json_str)
                except (json.JSONDecodeError, ValueError) as e:
                    print(f"Error loading cache: {e}. Using default settings.")
                    cls._instance = Settings()
            else:
                cls._instance = Settings()
        return cls._instance

    @classmethod
    def update_settings(cls, new_config: Settings) -> None:
        """Update the settings with new values."""
        cls._instance = new_config

    @classmethod
    def save_to_file(cls, filename: str = CACHE_FILE):
        """Save the current settings to a JSON file."""
        os.makedirs(CACHE_DIR, exist_ok=True)  # Ensure cache directory exists
        with open(filename, "w", encoding="utf-8") as f:
            f.write(cls._instance.model_dump_json(indent=4))

    @classmethod
    def load_cache_from_file(cls, filename: str = CACHE_FILE):
        """Load settings from a JSON file if it exists (for explicit loading)."""
        if os.path.exists(filename):
            try:
                with open(filename, "r", encoding="utf-8") as f:
                    json_str = f.read()
                    cls._instance = Settings.model_validate_json(json_str)
            except (json.JSONDecodeError, ValueError) as e:
                print(f"Error loading cache: {e}. Using default settings.")
                cls._instance = Settings()
        else:
            cls._instance = Settings()


# Dependency for FastAPI
def get_config() -> Settings:
    """Dependency injection function for FastAPI routes."""
    return SettingsManager.get_settings()


@router.get("/settings")
async def get_current_config(config: Settings = Depends(get_config)):
    """Get the current configuration."""
    return config


@router.post("/settings")
async def update_config(
    config: Settings, current_config: Settings = Depends(get_config)
):
    """Update the application configuration."""
    try:
        SettingsManager.update_settings(config)
        SettingsManager.save_to_file()
        return {"message": "Configuration updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


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
    api_url = f"{base_url}{project_id}/classifiers?api-version=1.1"
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


@router.get("/project/{project_id}/classifiers/{classifier_id}")
def get_classifier_id(project_id: str, classifier_id: str):
    """Retrieve classifiers from API."""
    api_url = f"{base_url}{project_id}/classifiers/{classifier_id}?api-version=1.1"
    headers = {
        "Authorization": f"Bearer {get_bearer_token()}",
        "accept": "application/json",
    }

    try:
        response = requests.get(api_url, headers=headers, timeout=300)
        response.raise_for_status()
        data = response.json()

        if not data.get("documentTypes"):
            raise HTTPException(status_code=404, detail="No classifier data found.")

        names = [doc_types["name"] for doc_types in data["documentTypes"]]
        # properties = data['properties']

        return names
    except requests.RequestException as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching classifier: {str(e)}"
        )


@router.get("/project/{project_id}/extractors")
def get_extractors(project_id: str):
    """Retrieve extractors from API."""
    api_url = f"{base_url}{project_id}/extractors?api-version=1.1"
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
