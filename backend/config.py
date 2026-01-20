"""Application configuration using pydantic-settings."""

from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Keys
    openai_api_key: str = ""

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:5173"

    # Server
    port: int = 8000
    environment: str = "development"

    # Rate limiting
    rate_limit: int = 10

    # Vector database
    chroma_db_path: str = "./chroma_db"
    collection_name: str = "portfolio_docs"

    # Embedding model
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # LLM
    llm_model: str = "gpt-4o-mini"

    # RAG configuration
    chunk_size: int = 450
    chunk_overlap: int = 90
    retrieval_k: int = 5

    @property
    def origins_list(self) -> List[str]:
        """Parse allowed origins into a list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    @property
    def is_local_embedding(self) -> bool:
        """Check if using local sentence-transformers model."""
        return self.embedding_model.startswith("sentence-transformers/")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
