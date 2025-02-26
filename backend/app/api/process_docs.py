from fastapi import APIRouter, UploadFile, File
import os
from config.project_config import BASE_URL
from api.auth import initialize_authentication


# Initialize authentication
auth = initialize_authentication()


def get_bearer_token():
    """Returns the latest valid bearer token."""
    return auth.get_bearer_token()


base_url = BASE_URL

router = APIRouter()


# Upload files
@router.post("/upload")
async def upload_files(files: UploadFile = File(...)):
    """Upload files to the server."""
    file_location = f"tmp/{files.filename}"
    with open(file_location, "wb") as file_object:
        file_object.write(files.file.read())
    return {"info": f"file '{files.filename}' saved at '{file_location}'"}


# Get all files
@router.get("/files")
async def get_files():
    """Get all files from the server."""
    files = os.listdir("tmp")
    return {"files": files}
