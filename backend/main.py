"""
RAG Backend API for Portfolio AI Guide

FastAPI application providing RAG-based Q&A about portfolio content.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import get_settings
from routers import rag
from services.vector_db import VectorDBService
from services.embedding_service import EmbeddingService


# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Services (initialized on startup)
vector_db: VectorDBService = None
embedding_service: EmbeddingService = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events - startup and shutdown."""
    global vector_db, embedding_service

    settings = get_settings()

    # Initialize services
    print(f"Initializing embedding service with model: {settings.embedding_model}")
    embedding_service = EmbeddingService(settings)

    print(f"Initializing vector database at: {settings.chroma_db_path}")
    vector_db = VectorDBService(settings, embedding_service)

    # Store in app state for access in routes
    app.state.vector_db = vector_db
    app.state.embedding_service = embedding_service
    app.state.settings = settings

    print("RAG backend started successfully!")

    yield

    # Cleanup
    print("Shutting down RAG backend...")


# Create FastAPI app
app = FastAPI(
    title="Portfolio RAG API",
    description="RAG-based Q&A API for portfolio content",
    version="1.0.0",
    lifespan=lifespan
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=86400,  # Cache preflight for 24 hours
)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# Include routers
app.include_router(rag.router, prefix="/api", tags=["RAG"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.environment,
        "embedding_model": settings.embedding_model,
        "llm_model": settings.llm_model
    }


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Portfolio RAG API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.environment == "development"
    )
