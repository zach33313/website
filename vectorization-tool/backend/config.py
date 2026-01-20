"""Application configuration for Vectorization Tool."""

from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Keys
    openai_api_key: str = ""

    # Canvas LMS (optional, used by canvas_scraper)
    canvas_api_url: str = ""
    canvas_api_token: str = ""

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:5174"

    # Server
    port: int = 8001
    environment: str = "development"

    # Default chunking settings
    default_chunk_size: int = 450
    default_chunk_overlap: int = 90
    default_chunk_strategy: str = "recursive"

    # Default embedding model
    default_embedding_model: str = "text-embedding-3-large"

    # Database paths
    db_path: str = "./data/canvas_tracker.db"
    chroma_persist_dir: str = "./canvas_chroma_db"

    @property
    def origins_list(self) -> List[str]:
        """Parse allowed origins into a list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
