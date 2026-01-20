"""
Vectorization Insight Tool - Backend API

FastAPI application providing document vectorization with visualization and analysis.
Includes Assignment Calendar System for Canvas LMS integration.
"""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import documents, chunking, embeddings, visualization, export, batch
from routers import assignments, calendar, cron
from services.database_service import DatabaseService
from services.scheduler_service import SchedulerService
from services.job_handlers import JobHandlers


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    settings = get_settings()
    app.state.settings = settings

    # Initialize database
    db = DatabaseService(db_path=getattr(settings, 'db_path', './data/canvas_tracker.db'))
    app.state.db = db
    logger.info("Database initialized")

    # Initialize scheduler
    scheduler = SchedulerService(db=db)
    app.state.scheduler = scheduler

    # Register job handlers
    job_handlers = JobHandlers(settings)
    for job_type, handler in job_handlers.get_handlers().items():
        scheduler.register_handler(job_type, handler)

    # Start scheduler
    scheduler.start()
    logger.info("Scheduler started")

    print(f"Vectorization Tool API started on port {settings.port}")
    yield

    # Shutdown
    scheduler.shutdown(wait=True)
    logger.info("Scheduler shutdown")
    print("Shutting down Vectorization Tool API...")


# Create FastAPI app
app = FastAPI(
    title="Vectorization Insight Tool API",
    description="API for document vectorization with visualization and analysis",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(chunking.router, prefix="/api/chunking", tags=["Chunking"])
app.include_router(embeddings.router, prefix="/api/embeddings", tags=["Embeddings"])
app.include_router(visualization.router, prefix="/api/visualization", tags=["Visualization"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(batch.router, prefix="/api/batch", tags=["Batch Processing"])

# Assignment Calendar System routers
app.include_router(assignments.router, prefix="/api/assignments", tags=["Assignments"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(cron.router, prefix="/api/cron", tags=["Cron Jobs"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "vectorization-tool"
    }


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Vectorization Insight Tool API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "documents": "/api/documents",
            "chunking": "/api/chunking",
            "embeddings": "/api/embeddings",
            "visualization": "/api/visualization",
            "export": "/api/export",
            "batch": "/api/batch",
            "assignments": "/api/assignments",
            "calendar": "/api/calendar",
            "cron": "/api/cron"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.environment == "development"
    )
