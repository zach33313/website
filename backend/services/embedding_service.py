"""Embedding service for generating text embeddings."""

from typing import List, Optional
import numpy as np

from config import Settings


class EmbeddingService:
    """Service for generating text embeddings using local or API models."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.model = None
        self._initialize_model()

    def _initialize_model(self):
        """Initialize the embedding model based on configuration."""
        if self.settings.is_local_embedding:
            # Use sentence-transformers for local embeddings
            from sentence_transformers import SentenceTransformer

            model_name = self.settings.embedding_model.replace("sentence-transformers/", "")
            print(f"Loading local embedding model: {model_name}")
            self.model = SentenceTransformer(model_name)
            self.dimensions = self.model.get_sentence_embedding_dimension()
            print(f"Model loaded with {self.dimensions} dimensions")
        else:
            # Use OpenAI for API-based embeddings
            from openai import OpenAI

            self.client = OpenAI(api_key=self.settings.openai_api_key)
            # text-embedding-3-small has 1536 dimensions
            self.dimensions = 1536 if "small" in self.settings.embedding_model else 3072

    def embed(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts.

        Args:
            texts: List of text strings to embed

        Returns:
            List of embedding vectors
        """
        if not texts:
            return []

        if self.settings.is_local_embedding:
            return self._embed_local(texts)
        else:
            return self._embed_openai(texts)

    def _embed_local(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using local sentence-transformers model."""
        embeddings = self.model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=len(texts) > 10
        )
        return embeddings.tolist()

    def _embed_openai(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using OpenAI API."""
        response = self.client.embeddings.create(
            model=self.settings.embedding_model,
            input=texts
        )
        return [item.embedding for item in response.data]

    def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a single query.

        Args:
            query: Query text to embed

        Returns:
            Embedding vector
        """
        embeddings = self.embed([query])
        return embeddings[0] if embeddings else []

    def get_dimensions(self) -> int:
        """Get the dimensionality of embeddings."""
        return self.dimensions
