"""LLM service for generating responses using OpenAI."""

from typing import AsyncGenerator, List, Dict, Any
from openai import OpenAI, AsyncOpenAI

from config import Settings


# System prompt for the portfolio assistant
SYSTEM_PROMPT = """You are a helpful AI assistant for Zach Hixson's portfolio website.
Your role is to answer questions about Zach's experience, projects, skills, and background.

INSTRUCTIONS:
1. Answer questions using ONLY the provided context below
2. If the context doesn't contain enough information to answer the question, say so clearly
3. Be conversational and friendly
4. Keep responses concise (2-3 paragraphs max)
5. When discussing projects or experience, be specific and cite details from the context
6. If asked about something not related to Zach's portfolio, politely redirect

CONTEXT FROM PORTFOLIO:
{context}

Remember: Only use information from the context above. Do not make up or assume information."""


class LLMService:
    """Service for generating responses using OpenAI models."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.async_client = AsyncOpenAI(api_key=settings.openai_api_key)

    def generate_response(
        self,
        question: str,
        context: str,
        chat_history: List[Dict[str, str]] = None
    ) -> str:
        """
        Generate a response to a question using the provided context.

        Args:
            question: User's question
            context: Retrieved context from vector database
            chat_history: Optional list of previous messages

        Returns:
            Generated response text
        """
        messages = self._build_messages(question, context, chat_history)

        response = self.client.chat.completions.create(
            model=self.settings.llm_model,
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )

        return response.choices[0].message.content

    async def generate_response_stream(
        self,
        question: str,
        context: str,
        chat_history: List[Dict[str, str]] = None
    ) -> AsyncGenerator[str, None]:
        """
        Generate a streaming response to a question.

        Args:
            question: User's question
            context: Retrieved context from vector database
            chat_history: Optional list of previous messages

        Yields:
            Chunks of the generated response
        """
        messages = self._build_messages(question, context, chat_history)

        stream = await self.async_client.chat.completions.create(
            model=self.settings.llm_model,
            messages=messages,
            temperature=0.7,
            max_tokens=500,
            stream=True
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def _build_messages(
        self,
        question: str,
        context: str,
        chat_history: List[Dict[str, str]] = None
    ) -> List[Dict[str, str]]:
        """Build the messages list for the API call."""
        messages = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT.format(context=context)
            }
        ]

        # Add chat history if provided
        if chat_history:
            for msg in chat_history[-6:]:  # Keep last 3 exchanges
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })

        # Add current question
        messages.append({
            "role": "user",
            "content": question
        })

        return messages
