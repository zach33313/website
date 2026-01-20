"""RAG service combining retrieval and generation."""

from typing import AsyncGenerator, List, Dict, Any, Optional

from config import Settings
from services.vector_db import VectorDBService
from services.llm_service import LLMService


class RAGService:
    """Service implementing the RAG pipeline."""

    def __init__(
        self,
        settings: Settings,
        vector_db: VectorDBService,
        llm_service: LLMService
    ):
        self.settings = settings
        self.vector_db = vector_db
        self.llm_service = llm_service

    def query(
        self,
        question: str,
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Process a question using RAG.

        Args:
            question: User's question
            chat_history: Optional conversation history

        Returns:
            Dict with response and retrieved sources
        """
        # Retrieve relevant documents
        retrieval_results = self.vector_db.query(
            query_text=question,
            n_results=self.settings.retrieval_k
        )

        # Format context from retrieved documents
        context = self._format_context(retrieval_results)

        # Generate response
        response = self.llm_service.generate_response(
            question=question,
            context=context,
            chat_history=chat_history
        )

        return {
            "response": response,
            "sources": self._format_sources(retrieval_results)
        }

    async def query_stream(
        self,
        question: str,
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> AsyncGenerator[str, None]:
        """
        Process a question using RAG with streaming response.

        Args:
            question: User's question
            chat_history: Optional conversation history

        Yields:
            Chunks of the generated response
        """
        # Retrieve relevant documents
        retrieval_results = self.vector_db.query(
            query_text=question,
            n_results=self.settings.retrieval_k
        )

        # Format context from retrieved documents
        context = self._format_context(retrieval_results)

        # Generate streaming response
        async for chunk in self.llm_service.generate_response_stream(
            question=question,
            context=context,
            chat_history=chat_history
        ):
            yield chunk

    def get_sources(self, question: str) -> List[Dict[str, Any]]:
        """
        Get the sources that would be retrieved for a question.

        Args:
            question: User's question

        Returns:
            List of source documents with metadata
        """
        retrieval_results = self.vector_db.query(
            query_text=question,
            n_results=self.settings.retrieval_k
        )
        return self._format_sources(retrieval_results)

    def _format_context(self, retrieval_results: Dict[str, Any]) -> str:
        """Format retrieved documents into a context string."""
        documents = retrieval_results.get("documents", [])
        metadatas = retrieval_results.get("metadatas", [])

        context_parts = []
        for i, (doc, meta) in enumerate(zip(documents, metadatas), 1):
            source = meta.get("source", "unknown") if meta else "unknown"
            context_parts.append(f"[Source {i}: {source}]\n{doc}")

        return "\n\n---\n\n".join(context_parts)

    def _format_sources(self, retrieval_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Format retrieval results into source list."""
        sources = []
        documents = retrieval_results.get("documents", [])
        metadatas = retrieval_results.get("metadatas", [])
        distances = retrieval_results.get("distances", [])

        for doc, meta, dist in zip(documents, metadatas, distances):
            sources.append({
                "content": doc[:200] + "..." if len(doc) > 200 else doc,
                "metadata": meta or {},
                "similarity": round(1 - dist, 3)  # Convert distance to similarity
            })

        return sources
