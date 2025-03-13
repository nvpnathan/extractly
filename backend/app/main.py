from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.discovery_routes import router as discovery_router
from api.process_docs import router as process_docs_router
from api.results_dashboard import router as dashboard_router
from config.project_setup import ensure_database

# Initialize the database
ensure_database()

app = FastAPI()

# Add CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*"
    ],  # Allow all origins (for testing, use specific domains in production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes with dependencies
app.include_router(discovery_router, prefix="/api/discovery")
app.include_router(process_docs_router, prefix="/api/process-docs")
app.include_router(dashboard_router, prefix="/api/dashboard")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
