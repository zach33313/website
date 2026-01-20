"""Embedding service supporting multiple providers."""

from typing import List, Dict, Any, Optional
import numpy as np


# Available embedding models
EMBEDDING_MODELS = {
    "sentence-transformers/all-MiniLM-L6-v2": {
        "provider": "local",
        "dimensions": 384,
        "max_tokens": 256,
        "description": "Fast, lightweight model for general use",
        "speed": "very_fast",
        "quality": "good"
    },
    "sentence-transformers/all-mpnet-base-v2": {
        "provider": "local",
        "dimensions": 768,
        "max_tokens": 384,
        "description": "Higher quality, still fast",
        "speed": "fast",
        "quality": "very_good"
    },
    "sentence-transformers/paraphrase-MiniLM-L6-v2": {
        "provider": "local",
        "dimensions": 384,
        "max_tokens": 256,
        "description": "Optimized for paraphrase detection",
        "speed": "very_fast",
        "quality": "good"
    },
    "text-embedding-3-small": {
        "provider": "openai",
        "dimensions": 1536,
        "max_tokens": 8191,
        "description": "OpenAI's efficient embedding model",
        "speed": "fast",
        "quality": "excellent",
        "supports_dimensions": True,
        "dimension_options": [256, 512, 1024, 1536]
    },
    "text-embedding-3-large": {
        "provider": "openai",
        "dimensions": 3072,
        "max_tokens": 8191,
        "description": "OpenAI's highest quality model",
        "speed": "medium",
        "quality": "excellent",
        "supports_dimensions": True,
        "dimension_options": [256, 512, 1024, 1536, 3072]
    }
}


class EmbeddingService:
    """Service for generating embeddings with various models."""

    def __init__(self, openai_api_key: Optional[str] = None):
        self.openai_api_key = openai_api_key
        self._local_models = {}
        self._openai_client = None

    def _get_local_model(self, model_name: str):
        """Get or load a local sentence-transformers model."""
        if model_name not in self._local_models:
            from sentence_transformers import SentenceTransformer

            # Remove prefix if present
            model_id = model_name.replace("sentence-transformers/", "")
            self._local_models[model_name] = SentenceTransformer(model_id)

        return self._local_models[model_name]

    def _get_openai_client(self):
        """Get or create OpenAI client."""
        if self._openai_client is None:
            if not self.openai_api_key:
                raise ValueError("OpenAI API key required for OpenAI models")
            from openai import OpenAI
            self._openai_client = OpenAI(api_key=self.openai_api_key)
        return self._openai_client

    def embed(
        self,
        texts: List[str],
        model: str = "sentence-transformers/all-MiniLM-L6-v2",
        dimensions: Optional[int] = None,
        normalize: bool = True,
        batch_size: int = 32
    ) -> Dict[str, Any]:
        """
        Generate embeddings for a list of texts.

        Args:
            texts: List of texts to embed
            model: Model name
            dimensions: Optional dimension reduction (for supported models)
            normalize: Whether to normalize embeddings
            batch_size: Batch size for processing

        Returns:
            Dict with embeddings and metadata
        """
        if not texts:
            return {"embeddings": [], "model": model, "dimensions": 0}

        model_info = EMBEDDING_MODELS.get(model)
        if not model_info:
            raise ValueError(f"Unknown model: {model}")

        if model_info["provider"] == "local":
            embeddings = self._embed_local(texts, model, normalize, batch_size)
        elif model_info["provider"] == "openai":
            if not self.openai_api_key:
                raise ValueError("OpenAI API key required. Set OPENAI_API_KEY in your .env file.")
            embeddings = self._embed_openai(texts, model, dimensions, batch_size)
        else:
            raise ValueError(f"Unknown provider: {model_info['provider']}")

        actual_dimensions = len(embeddings[0]) if embeddings else 0

        return {
            "embeddings": embeddings,
            "model": model,
            "dimensions": actual_dimensions,
            "count": len(embeddings),
            "normalized": normalize
        }

    def _embed_local(
        self,
        texts: List[str],
        model: str,
        normalize: bool,
        batch_size: int
    ) -> List[List[float]]:
        """Generate embeddings using local model."""
        model_obj = self._get_local_model(model)

        embeddings = model_obj.encode(
            texts,
            batch_size=batch_size,
            convert_to_numpy=True,
            normalize_embeddings=normalize,
            show_progress_bar=len(texts) > 10
        )

        return embeddings.tolist()

    def _embed_openai(
        self,
        texts: List[str],
        model: str,
        dimensions: Optional[int],
        batch_size: int
    ) -> List[List[float]]:
        """Generate embeddings using OpenAI API."""
        client = self._get_openai_client()

        all_embeddings = []

        # Process in batches
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]

            kwargs = {"model": model, "input": batch}
            if dimensions:
                kwargs["dimensions"] = dimensions

            response = client.embeddings.create(**kwargs)

            for item in response.data:
                all_embeddings.append(item.embedding)

        return all_embeddings

    def get_available_models(self) -> Dict[str, Any]:
        """Get information about available models."""
        return EMBEDDING_MODELS

    def get_model_info(self, model: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific model."""
        return EMBEDDING_MODELS.get(model)
