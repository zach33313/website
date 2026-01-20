"""Vector database service using ChromaDB."""

from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings

from config import Settings
from services.embedding_service import EmbeddingService


class VectorDBService:
    """Service for vector storage and retrieval using ChromaDB."""

    def __init__(self, settings: Settings, embedding_service: EmbeddingService):
        self.settings = settings
        self.embedding_service = embedding_service
        self._initialize_db()

    def _initialize_db(self):
        """Initialize ChromaDB client and collection."""
        # Use persistent client for disk storage
        self.client = chromadb.PersistentClient(
            path=self.settings.chroma_db_path,
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )

        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=self.settings.collection_name,
            metadata={"hnsw:space": "cosine"}  # Use cosine similarity
        )

        print(f"Collection '{self.settings.collection_name}' has {self.collection.count()} documents")

    def add_documents(
        self,
        documents: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None,
        ids: Optional[List[str]] = None
    ) -> None:
        """
        Add documents to the vector database.

        Args:
            documents: List of document texts
            metadatas: Optional list of metadata dicts for each document
            ids: Optional list of unique IDs (auto-generated if not provided)
        """
        if not documents:
            return

        # Generate IDs if not provided
        if ids is None:
            existing_count = self.collection.count()
            ids = [f"doc_{existing_count + i}" for i in range(len(documents))]

        # Generate embeddings
        embeddings = self.embedding_service.embed(documents)

        # Add to collection
        self.collection.add(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )

        print(f"Added {len(documents)} documents to collection")

    def query(
        self,
        query_text: str,
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Query the vector database for similar documents.

        Args:
            query_text: Query text to find similar documents for
            n_results: Number of results to return
            where: Optional filter conditions

        Returns:
            Dict containing ids, documents, metadatas, and distances
        """
        # Generate query embedding
        query_embedding = self.embedding_service.embed_query(query_text)

        # Query collection
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where,
            include=["documents", "metadatas", "distances"]
        )

        return {
            "ids": results["ids"][0] if results["ids"] else [],
            "documents": results["documents"][0] if results["documents"] else [],
            "metadatas": results["metadatas"][0] if results["metadatas"] else [],
            "distances": results["distances"][0] if results["distances"] else []
        }

    def get_all_documents(self) -> Dict[str, Any]:
        """Get all documents in the collection."""
        return self.collection.get(include=["documents", "metadatas"])

    def delete_all(self) -> None:
        """Delete all documents from the collection."""
        # Get all IDs
        all_docs = self.collection.get()
        if all_docs["ids"]:
            self.collection.delete(ids=all_docs["ids"])
            print(f"Deleted {len(all_docs['ids'])} documents")

    def delete_by_source(self, source: str) -> None:
        """Delete all documents from a specific source."""
        all_docs = self.collection.get(
            where={"source": source},
            include=["metadatas"]
        )
        if all_docs["ids"]:
            self.collection.delete(ids=all_docs["ids"])
            print(f"Deleted {len(all_docs['ids'])} documents from source: {source}")

    def count(self) -> int:
        """Get the number of documents in the collection."""
        return self.collection.count()

    def get_collection_info(self) -> Dict[str, Any]:
        """Get information about the collection."""
        return {
            "name": self.settings.collection_name,
            "count": self.collection.count(),
            "path": self.settings.chroma_db_path
        }
