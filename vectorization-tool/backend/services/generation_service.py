"""Generation service for LLM-powered study guides and solutions."""

import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from openai import OpenAI

from services.database_service import DatabaseService
from services.assignment_service import AssignmentService, ChunkSearchResult


@dataclass
class GenerationResult:
    """Result of content generation."""
    content_markdown: str
    citations: List[Dict[str, Any]]
    model_used: str
    token_usage: Dict[str, int]


class GenerationService:
    """Service for generating study guides and solutions using LLM."""

    STUDY_GUIDE_SYSTEM_PROMPT = """You are a helpful study assistant. Your task is to create a comprehensive study guide based on course materials.

When creating study guides:
1. Identify the key concepts and topics from the provided materials
2. Organize information in a clear, logical structure
3. Include definitions, explanations, and examples
4. Highlight important formulas, procedures, or frameworks
5. Add practice questions or review prompts when appropriate
6. Use markdown formatting for readability

MATHEMATICAL FORMATTING:
- Use LaTeX for ALL mathematical expressions, equations, and formulas
- Inline math: $expression$ (e.g., $x^2 + y^2 = r^2$)
- Display math (centered, separate line): $$expression$$ (e.g., $$\\frac{d}{dx}[f(x)] = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$)
- Use display math for important equations and formulas
- Use inline math for variables and simple expressions within text

Always cite your sources using the format [Source: filename] when referencing specific materials."""

    SOLUTION_SYSTEM_PROMPT = """You are an educational assistant helping with homework and assignments. Your role is to provide detailed solution attempts with explanations.

IMPORTANT: This is a "nuclear option" feature - provide complete solutions with full explanations.

When providing solutions:
1. Break down the problem into steps
2. Show your reasoning at each step
3. Cite relevant course materials using [Source: filename]
4. Explain the underlying concepts
5. Point out common mistakes to avoid
6. Provide the final answer clearly marked

MATHEMATICAL FORMATTING:
- Use LaTeX for ALL mathematical expressions, equations, and formulas
- Inline math: $expression$ (e.g., $x^2 + y^2 = r^2$)
- Display math (centered, separate line): $$expression$$ (e.g., $$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$)
- Show all work using proper mathematical notation
- Use display math for step-by-step solutions

Format your response in markdown with clear sections."""

    def __init__(
        self,
        db: DatabaseService,
        assignment_service: AssignmentService,
        openai_api_key: str,
        default_model: str = "gpt-4o"
    ):
        self.db = db
        self.assignment_service = assignment_service
        self.client = OpenAI(api_key=openai_api_key)
        self.default_model = default_model

    def _format_chunks_for_context(
        self,
        chunks: List[ChunkSearchResult],
        max_tokens: int = 8000
    ) -> str:
        """Format chunks as context for the LLM, respecting token limits."""
        context_parts = []
        estimated_tokens = 0

        for chunk in chunks:
            # Rough token estimation (4 chars per token)
            chunk_tokens = len(chunk.content) // 4

            if estimated_tokens + chunk_tokens > max_tokens:
                break

            context_parts.append(
                f"--- Source: {chunk.filename} (relevance: {chunk.relevance_score:.2f}) ---\n"
                f"{chunk.content}\n"
            )
            estimated_tokens += chunk_tokens

        return "\n".join(context_parts)

    def _extract_citations(self, content: str) -> List[Dict[str, Any]]:
        """Extract citations from generated content."""
        # Find all [Source: filename] patterns
        pattern = r'\[Source:\s*([^\]]+)\]'
        matches = re.findall(pattern, content)

        # Deduplicate and format
        citations = []
        seen = set()
        for match in matches:
            filename = match.strip()
            if filename not in seen:
                seen.add(filename)
                citations.append({
                    "filename": filename,
                    "reference": f"[Source: {filename}]"
                })

        return citations

    # =========================================================================
    # Study Guide Generation
    # =========================================================================

    def generate_study_guide(
        self,
        assignment_id: int,
        model: Optional[str] = None,
        max_context_tokens: int = 8000,
        save_to_db: bool = True
    ) -> GenerationResult:
        """
        Generate a study guide for an assignment based on relevant course materials.
        """
        model = model or self.default_model

        # Get assignment
        assignment = self.db.get_assignment(assignment_id)
        if not assignment:
            raise ValueError(f"Assignment {assignment_id} not found")

        # Get relevant chunks using comprehensive paragraph-by-paragraph search
        chunks = self.assignment_service.get_cached_chunks(assignment_id)
        if not chunks:
            # Use comprehensive search that queries for each paragraph
            chunks = self.assignment_service.find_relevant_chunks_comprehensive(
                assignment_id,
                results_per_query=5,
                max_total_chunks=30,
                save_to_db=True
            )

        if not chunks:
            raise ValueError("No relevant course materials found for this assignment")

        # Format context from retrieved chunks
        context = self._format_chunks_for_context(chunks, max_context_tokens)

        # Get full assignment content including attached files
        try:
            full_assignment_content = self.assignment_service.get_full_assignment_content(assignment_id)
        except Exception:
            # Fallback to basic info if file fetching fails
            full_assignment_content = f"Assignment: {assignment['name']}\n"
            if assignment.get("description"):
                desc = re.sub(r'<[^>]+>', ' ', assignment["description"])
                desc = re.sub(r'\s+', ' ', desc).strip()
                full_assignment_content += f"Description: {desc}\n"

        if assignment.get("points_possible"):
            full_assignment_content += f"\nPoints: {assignment['points_possible']}\n"

        user_prompt = f"""Please create a comprehensive study guide for the following assignment.

=== ASSIGNMENT DETAILS ===
{full_assignment_content}

=== RELEVANT COURSE MATERIALS ===
{context}

Create a study guide that:
1. Covers all key concepts needed for this assignment
2. Includes clear explanations with examples
3. Provides practice problems or review questions
4. Cites specific sources using [Source: filename] format"""

        # Call LLM
        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": self.STUDY_GUIDE_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=4000
        )

        content = response.choices[0].message.content
        citations = self._extract_citations(content)

        result = GenerationResult(
            content_markdown=content,
            citations=citations,
            model_used=model,
            token_usage={
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        )

        # Save to database
        if save_to_db:
            self.db.save_generated_content(
                assignment_id=assignment_id,
                content_type="study_guide",
                content_markdown=content,
                citations=[c["filename"] for c in citations],
                model_used=model
            )

        return result

    def get_study_guide(self, assignment_id: int) -> Optional[Dict[str, Any]]:
        """Get cached study guide for an assignment."""
        return self.db.get_generated_content(assignment_id, "study_guide")

    # =========================================================================
    # Solution Generation (Nuclear Option)
    # =========================================================================

    def generate_solution(
        self,
        assignment_id: int,
        model: Optional[str] = None,
        max_context_tokens: int = 8000,
        save_to_db: bool = True
    ) -> GenerationResult:
        """
        Generate a solution attempt for an assignment.

        WARNING: This is the "nuclear option" - provides complete solutions.
        Use responsibly and in accordance with academic integrity policies.
        """
        model = model or self.default_model

        # Get assignment
        assignment = self.db.get_assignment(assignment_id)
        if not assignment:
            raise ValueError(f"Assignment {assignment_id} not found")

        # Get relevant chunks using comprehensive paragraph-by-paragraph search
        chunks = self.assignment_service.get_cached_chunks(assignment_id)
        if not chunks:
            # Use comprehensive search that queries for each paragraph
            chunks = self.assignment_service.find_relevant_chunks_comprehensive(
                assignment_id,
                results_per_query=5,
                max_total_chunks=30,
                save_to_db=True
            )

        # Format context from retrieved chunks
        context = self._format_chunks_for_context(chunks, max_context_tokens)

        # Get full assignment content including attached files
        try:
            full_assignment_content = self.assignment_service.get_full_assignment_content(assignment_id)
        except Exception:
            # Fallback to basic info if file fetching fails
            full_assignment_content = f"Assignment: {assignment['name']}\n"
            if assignment.get("description"):
                desc = re.sub(r'<[^>]+>', ' ', assignment["description"])
                desc = re.sub(r'\s+', ' ', desc).strip()
                full_assignment_content += f"\nFull Description/Instructions:\n{desc}\n"

        if assignment.get("points_possible"):
            full_assignment_content += f"\nPoints: {assignment['points_possible']}\n"
        if assignment.get("submission_types"):
            import json
            types = json.loads(assignment["submission_types"]) if isinstance(
                assignment["submission_types"], str
            ) else assignment["submission_types"]
            full_assignment_content += f"Submission Types: {', '.join(types)}\n"

        user_prompt = f"""Please provide a complete solution attempt for the following assignment.

=== ASSIGNMENT DETAILS (INCLUDING ATTACHED FILES) ===
{full_assignment_content}

=== RELEVANT COURSE MATERIALS ===
{context}

Provide:
1. A complete solution with all steps shown
2. Explanations of the reasoning at each step
3. Citations to course materials using [Source: filename]
4. The final answer clearly marked
5. Any relevant formulas or concepts used"""

        # Call LLM
        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": self.SOLUTION_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,  # Lower temperature for more deterministic solutions
            max_tokens=4000
        )

        content = response.choices[0].message.content
        citations = self._extract_citations(content)

        result = GenerationResult(
            content_markdown=content,
            citations=citations,
            model_used=model,
            token_usage={
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        )

        # Save to database
        if save_to_db:
            self.db.save_generated_content(
                assignment_id=assignment_id,
                content_type="solution",
                content_markdown=content,
                citations=[c["filename"] for c in citations],
                model_used=model
            )

        return result

    def get_solution(self, assignment_id: int) -> Optional[Dict[str, Any]]:
        """Get cached solution for an assignment."""
        return self.db.get_generated_content(assignment_id, "solution")

    # =========================================================================
    # Custom Generation
    # =========================================================================

    def generate_custom(
        self,
        assignment_id: int,
        prompt: str,
        model: Optional[str] = None,
        max_context_tokens: int = 8000
    ) -> GenerationResult:
        """
        Generate custom content for an assignment with a user-specified prompt.

        Useful for specific questions or explanations about course material.
        """
        model = model or self.default_model

        # Get assignment
        assignment = self.db.get_assignment(assignment_id)
        if not assignment:
            raise ValueError(f"Assignment {assignment_id} not found")

        # Get relevant chunks using comprehensive paragraph-by-paragraph search
        chunks = self.assignment_service.get_cached_chunks(assignment_id)
        if not chunks:
            chunks = self.assignment_service.find_relevant_chunks_comprehensive(
                assignment_id,
                results_per_query=5,
                max_total_chunks=30,
                save_to_db=True
            )

        # Format context
        context = self._format_chunks_for_context(chunks, max_context_tokens)

        system_prompt = """You are a helpful educational assistant. Answer the user's question using the provided course materials.
Always cite your sources using the format [Source: filename] when referencing specific materials.
Use markdown formatting for readability."""

        user_prompt = f"""Assignment: {assignment['name']}

Relevant course materials:

{context}

User's question: {prompt}"""

        # Call LLM
        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )

        content = response.choices[0].message.content
        citations = self._extract_citations(content)

        return GenerationResult(
            content_markdown=content,
            citations=citations,
            model_used=model,
            token_usage={
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        )
