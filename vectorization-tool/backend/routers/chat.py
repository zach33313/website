"""Chat API endpoint for portfolio assistant."""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from openai import OpenAI
import chromadb
from chromadb.config import Settings as ChromaSettings

from config import get_settings


router = APIRouter()

# System prompt for the portfolio assistant
SYSTEM_PROMPT = """You are a helpful AI assistant on Zach Hixson's portfolio website.
Your role is to answer questions about Zach's experience, projects, skills, and background.

INSTRUCTIONS:
1. Answer questions using ONLY the provided context below
2. If the context doesn't contain enough information, say so politely
3. Be conversational, friendly, and concise (2-3 short paragraphs max)
4. When discussing projects or experience, be specific and cite details from the context
5. If asked about something not related to Zach's portfolio, politely redirect
6. Keep responses brief - this is a small chat widget, not a full conversation

CONTEXT FROM PORTFOLIO:
{context}

Remember: Only use information from the context above. Do not make up or assume information."""


class ChatRequest(BaseModel):
    """Request model for chat."""
    message: str = Field(..., min_length=1, max_length=1000)
    chat_history: Optional[List[Dict[str, str]]] = Field(default=None, max_length=10)


class ChatResponse(BaseModel):
    """Response model for chat."""
    response: str
    sources: Optional[List[str]] = None


def get_vector_client():
    """Get ChromaDB client for the documents collection."""
    settings = get_settings()
    client = chromadb.PersistentClient(
        path=settings.chroma_persist_dir,
        settings=ChromaSettings(anonymized_telemetry=False)
    )
    return client


def query_vectors(query_text: str, n_results: int = 5) -> List[Dict[str, Any]]:
    """Query the vector database for relevant chunks."""
    try:
        client = get_vector_client()
        collection = client.get_collection("documents")

        results = collection.query(
            query_texts=[query_text],
            n_results=n_results,
            include=["documents", "metadatas", "distances"]
        )

        chunks = []
        if results and results.get("documents") and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                metadata = results["metadatas"][0][i] if results.get("metadatas") else {}
                chunks.append({
                    "content": doc,
                    "filename": metadata.get("filename", "unknown"),
                    "distance": results["distances"][0][i] if results.get("distances") else 0
                })
        return chunks
    except Exception as e:
        print(f"Error querying vectors: {e}")
        return []


def format_context(chunks: List[Dict[str, Any]]) -> str:
    """Format chunks into context string."""
    if not chunks:
        return "No relevant information found."

    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        source = chunk.get("filename", "unknown")
        content = chunk.get("content", "")
        context_parts.append(f"[Source {i}: {source}]\n{content}")

    return "\n\n---\n\n".join(context_parts)


def generate_response(
    question: str,
    context: str,
    chat_history: Optional[List[Dict[str, str]]] = None
) -> str:
    """Generate a response using OpenAI."""
    settings = get_settings()

    if not settings.openai_api_key:
        return "Sorry, the assistant is not configured yet. Please check back later!"

    client = OpenAI(api_key=settings.openai_api_key)

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT.format(context=context)
        }
    ]

    # Add chat history if provided (keep last 6 messages)
    if chat_history:
        for msg in chat_history[-6:]:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })

    # Add current question
    messages.append({
        "role": "user",
        "content": question
    })

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=300  # Keep responses concise for chat widget
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error generating response: {e}")
        return "Sorry, I couldn't process that. Please try again!"


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    """
    Chat endpoint for the portfolio assistant.

    Queries the vector database for relevant context and generates a response.
    """
    try:
        # Query vector store for relevant chunks
        chunks = query_vectors(body.message, n_results=5)

        # Format context
        context = format_context(chunks)

        # Generate response
        response = generate_response(
            question=body.message,
            context=context,
            chat_history=body.chat_history
        )

        # Extract source filenames
        sources = [chunk.get("filename") for chunk in chunks if chunk.get("filename")]

        return ChatResponse(
            response=response,
            sources=sources[:3] if sources else None  # Return top 3 sources
        )
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="An error occurred processing your request")
