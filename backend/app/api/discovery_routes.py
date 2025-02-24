from fastapi import APIRouter, HTTPException
from typing import Dict
import os
import json
import requests
from config.project_config import CACHE_DIR, CACHE_FILE
from config.project_config import BASE_URL
from api.auth import initialize_authentication


# Initialize Authentication
auth = initialize_authentication()
bearer_token = auth.bearer_token
base_url = BASE_URL

router = APIRouter()


def ensure_cache_directory():
    """Ensure the cache directory exists."""
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)


def save_cache_to_file(cache_data: dict):
    """Save the cache to a JSON file."""
    ensure_cache_directory()
    with open(CACHE_FILE, "w") as cache_file:
        json.dump(cache_data, cache_file, indent=4)


def load_cache_from_file() -> dict:
    """Load the cache from a JSON file or return an empty dict if it doesn't exist."""
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r") as cache_file:
            return json.load(cache_file)
    return {}


@router.get("/settings")
def get_settings():
    """Retrieve stored settings from cache."""
    cache = load_cache_from_file()
    return {
        "validate_classification": cache.get("validate_classification", False),
        "validate_extraction": cache.get("validate_extraction", False),
        "validate_extraction_later": cache.get("validate_extraction_later", False),
        "perform_classification": cache.get("perform_classification", False),
        "perform_extraction": cache.get("perform_extraction", False),
    }


@router.post("/settings")
def update_settings(settings: Dict[str, bool]):
    """Update user settings and save them to cache."""
    cache = load_cache_from_file()
    cache.update(settings)
    save_cache_to_file(cache)
    return {"message": "Settings updated successfully."}


@router.get("/projects")
def get_projects():
    """Retrieve projects from API or cache."""
    cache = load_cache_from_file()
    if "project" in cache:
        return cache["project"]

    api_url = f"{base_url}?api-version=1.1"
    headers = {"Authorization": f"Bearer {bearer_token}", "accept": "application/json"}

    try:
        response = requests.get(api_url, headers=headers, timeout=300)
        response.raise_for_status()
        data = response.json()

        if not data.get("projects"):
            raise HTTPException(status_code=404, detail="No projects found.")

        save_cache_to_file({"project": data["projects"]})
        return data["projects"]
    except requests.RequestException as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching projects: {str(e)}"
        )


@router.get("/project/{project_id}/classifiers")
def get_classifiers(project_id: str):
    """Retrieve classifiers from API or cache."""
    cache = load_cache_from_file()
    if "classifier_id" in cache.get("project", {}):
        return cache["project"]["classifier_id"]

    api_url = f"{base_url}/{project_id}/classifiers?api-version=1.1"
    headers = {"Authorization": f"Bearer {bearer_token}", "accept": "application/json"}

    try:
        response = requests.get(api_url, headers=headers, timeout=300)
        response.raise_for_status()
        data = response.json()

        if not data.get("classifiers"):
            raise HTTPException(status_code=404, detail="No classifiers found.")

        save_cache_to_file({"project": {"classifier_id": data["classifiers"]}})
        return data["classifiers"]
    except requests.RequestException as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching classifiers: {str(e)}"
        )


@router.get("/project/{project_id}/extractors")
def get_extractors(project_id: str):
    """Retrieve extractors from API or cache."""
    cache = load_cache_from_file()
    if "extractor_ids" in cache.get("project", {}):
        return cache["project"]["extractor_ids"]

    api_url = f"{base_url}/{project_id}/extractors?api-version=1.1"
    headers = {"Authorization": f"Bearer {bearer_token}", "accept": "application/json"}

    try:
        response = requests.get(api_url, headers=headers, timeout=300)
        response.raise_for_status()
        data = response.json()

        if not data.get("extractors"):
            raise HTTPException(status_code=404, detail="No extractors found.")

        save_cache_to_file({"project": {"extractor_ids": data["extractors"]}})
        return data["extractors"]
    except requests.RequestException as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching extractors: {str(e)}"
        )
