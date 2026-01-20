# LLM and RAG Architecture Research for Portfolio Q&A System

**Research Date:** January 2026
**Use Case:** Personal portfolio Q&A chatbot with RAG
**Expected Volume:** 100-1,000 queries per month

---

## Table of Contents

1. [LLM Provider Comparison](#llm-provider-comparison)
2. [RAG Architecture Best Practices](#rag-architecture-best-practices)
3. [Recommendations](#recommendations)

---

## LLM Provider Comparison

### Summary Table

| Provider | Model | Input ($/1M tokens) | Output ($/1M tokens) | Context Window | Latency | Best For |
|----------|-------|---------------------|----------------------|----------------|---------|----------|
| **OpenAI** | GPT-4o-mini | $0.15 | $0.60 | 128K | Fast | Best value, strong quality |
| **OpenAI** | GPT-3.5-turbo | ~$0.50 | ~$1.50 | 16K | Fast | Legacy, use 4o-mini instead |
| **Anthropic** | Claude 3 Haiku | $0.25 | $1.25 | 200K | Fast | Cost-effective with large context |
| **Anthropic** | Claude 3.5 Haiku | $0.80 | $4.00 | 200K | Fast | Better quality, still affordable |
| **Anthropic** | Claude 3.5 Sonnet | $3.00 | $15.00 | 200K | Medium | Premium quality |
| **Google** | Gemini 1.5 Flash | $0.075 | $0.30 | 1M | Very Fast | Ultra-low cost, huge context |
| **Google** | Gemini 2.0 Flash | $0.10 | $0.40 | 1M | Very Fast | Latest, fast, affordable |
| **Groq** | Llama 3.3 70B | $0.59 | $0.99 | 128K | Ultra-Fast | Speed-critical applications |
| **Together AI** | Llama 4 Maverick | $0.27 | $0.85 | 128K+ | Fast | Open-source flexibility |
| **Together AI** | GPT-OSS 120B | $0.15 | $0.60 | Varies | Fast | GPT-4o-mini alternative |
| **Fireworks AI** | Llama 3 70B | ~$0.30 | ~$0.90 | 128K | Very Fast | High throughput |
| **Fireworks AI** | Mixtral 8x7B | ~$0.20 | ~$0.60 | 32K | Very Fast | 300+ tokens/sec |
| **Local (Ollama)** | Llama 3.2 8B | Free | Free | 128K | Medium | Privacy, no API costs |
| **Local (Ollama)** | Mistral 7B | Free | Free | 32K | Medium | Lightweight |
| **Local (Ollama)** | Phi-3 3.8B | Free | Free | 4K | Fast | Resource-constrained |

### Detailed Provider Analysis

#### 1. OpenAI (GPT-3.5-turbo & GPT-4o-mini)

**GPT-4o-mini** (Recommended over GPT-3.5-turbo)
- **Pricing:** $0.15 / $0.60 per 1M tokens (input/output)
- **Context Window:** 128,000 tokens
- **Latency:** ~0.3-0.6s time-to-first-token
- **Quality:** Surpasses GPT-3.5-turbo on all benchmarks while being 60% cheaper
- **API:** Excellent documentation, mature ecosystem, OpenAI SDK

**GPT-3.5-turbo** (Legacy)
- **Pricing:** ~$0.50 / $1.50 per 1M tokens
- **Context Window:** 16,384 tokens
- **Note:** Deprecated for most use cases; GPT-4o-mini is better and cheaper

**Monthly Cost Estimate (500 queries, ~1K tokens each):**
- GPT-4o-mini: ~$0.08-0.15/month

```python
# OpenAI API Example
from openai import OpenAI
client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a helpful assistant..."},
        {"role": "user", "content": f"Context: {retrieved_context}\n\nQuestion: {user_question}"}
    ],
    max_tokens=500,
    temperature=0.7
)
```

---

#### 2. Anthropic (Claude Haiku & Claude 3.5 Sonnet)

**Claude 3 Haiku**
- **Pricing:** $0.25 / $1.25 per 1M tokens
- **Context Window:** 200,000 tokens
- **Latency:** Fast, optimized for speed
- **Quality:** Good for straightforward Q&A tasks

**Claude 3.5 Haiku**
- **Pricing:** $0.80 / $4.00 per 1M tokens
- **Context Window:** 200,000 tokens
- **Quality:** Significantly better reasoning than Claude 3 Haiku

**Claude 3.5 Sonnet**
- **Pricing:** $3.00 / $15.00 per 1M tokens
- **Context Window:** 200,000 tokens
- **Latency:** ~2s time-to-first-token, ~77 tokens/sec
- **Quality:** Excellent for complex reasoning and nuanced responses

**Cost-Saving Features:**
- Batch API: 50% discount for async processing
- Prompt Caching: Up to 90% reduction for repeated context

**Monthly Cost Estimate (500 queries):**
- Claude 3 Haiku: ~$0.12-0.25/month
- Claude 3.5 Haiku: ~$0.40-0.80/month

```python
# Anthropic API Example
import anthropic

client = anthropic.Anthropic()
message = client.messages.create(
    model="claude-3-5-haiku-20241022",
    max_tokens=500,
    system="You are a helpful portfolio assistant...",
    messages=[
        {"role": "user", "content": f"<context>{retrieved_context}</context>\n\n{user_question}"}
    ]
)
```

---

#### 3. Google Gemini Flash

**Gemini 1.5 Flash**
- **Pricing:** $0.075 / $0.30 per 1M tokens (under 128K context)
- **Context Window:** 1,000,000 tokens
- **Latency:** ~0.25s time-to-first-token, ~250 tokens/sec
- **Quality:** Good for general Q&A, excellent speed

**Gemini 2.0 Flash**
- **Pricing:** $0.10 / $0.40 per 1M tokens
- **Context Window:** 1,000,000 tokens
- **Latency:** Sub-second responses
- **Quality:** Improved reasoning over 1.5

**Key Advantage:** Massive context window allows stuffing all portfolio content without RAG in some cases.

**Free Tier:** Google AI Studio offers free access with rate limits (15 requests/minute).

**Monthly Cost Estimate (500 queries):**
- Gemini 1.5 Flash: ~$0.04-0.08/month (cheapest option)

```python
# Google Gemini API Example
import google.generativeai as genai

genai.configure(api_key="YOUR_API_KEY")
model = genai.GenerativeModel("gemini-1.5-flash")

response = model.generate_content(
    f"Context: {retrieved_context}\n\nQuestion: {user_question}"
)
```

---

#### 4. Groq (Ultra-Fast Inference)

**Llama 3.3 70B (Speculative Decoding)**
- **Pricing:** $0.59 / $0.99 per 1M tokens
- **Context Window:** 128,000 tokens
- **Latency:** Industry-leading speed via custom LPU hardware
- **Quality:** Excellent open-source model quality

**Key Advantage:** 4-6x faster than typical GPU inference. Best for real-time chat experiences.

**Batch API:** 50% discount available for non-urgent requests.

**Monthly Cost Estimate (500 queries):**
- Llama 3.3 70B: ~$0.30-0.50/month

```python
# Groq API Example
from groq import Groq

client = Groq()
completion = client.chat.completions.create(
    model="llama-3.3-70b-specdec",
    messages=[
        {"role": "system", "content": "You are a helpful assistant..."},
        {"role": "user", "content": f"{retrieved_context}\n\n{user_question}"}
    ],
    max_tokens=500
)
```

---

#### 5. Together AI

**Model Options:**
- Llama 4 Maverick: $0.27 / $0.85 per 1M tokens
- GPT-OSS 120B: $0.15 / $0.60 per 1M tokens (GPT-4o-mini equivalent)
- GPT-OSS 20B: $0.05 / $0.20 per 1M tokens (ultra-budget)

**Key Advantages:**
- 200+ open-source models available
- Competitive pricing on popular models
- Batch API with 50% discount
- Fine-tuning support

**Monthly Cost Estimate (500 queries):**
- GPT-OSS 120B: ~$0.08-0.15/month

```python
# Together AI API Example (OpenAI-compatible)
from openai import OpenAI

client = OpenAI(
    base_url="https://api.together.xyz/v1",
    api_key="YOUR_TOGETHER_API_KEY"
)

response = client.chat.completions.create(
    model="meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    messages=[{"role": "user", "content": prompt}]
)
```

---

#### 6. Fireworks AI

**Model Options:**
- Llama 3 70B: ~$0.30 / $0.90 per 1M tokens, 0.27s latency
- Mixtral 8x7B: ~$0.20 / $0.60 per 1M tokens, 0.25s latency
- Mixtral 8x22B: ~$0.40 / $1.20 per 1M tokens

**Key Advantages:**
- Custom CUDA kernels (FireAttention) for 300+ tokens/sec
- 2.5x higher throughput than open-source engines
- Batch processing at 40-50% discount
- SOC 2 Type II and HIPAA compliant

**Monthly Cost Estimate (500 queries):**
- Mixtral 8x7B: ~$0.10-0.20/month

---

#### 7. Local Models via Ollama

**Llama 3.2 8B**
- **Pricing:** Free (your hardware costs only)
- **Context Window:** 128,000 tokens
- **RAM Required:** ~8GB
- **Speed:** 76% faster than Mistral 7B in benchmarks
- **Quality Score:** 0.83 in comparative tests

**Mistral 7B**
- **Pricing:** Free
- **Context Window:** 32,000 tokens
- **RAM Required:** ~6GB
- **Quality Score:** 0.83 (same as Llama 3.2)

**Phi-3 3.8B**
- **Pricing:** Free
- **Context Window:** 4,000 tokens
- **RAM Required:** ~4GB
- **Note:** Matches larger models on MMLU benchmarks, runs on phones

**Setup:**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull and run models
ollama pull llama3.2
ollama pull mistral
ollama pull phi3

# Run inference
ollama run llama3.2 "Your prompt here"
```

**API Usage:**
```python
import requests

response = requests.post(
    "http://localhost:11434/api/generate",
    json={
        "model": "llama3.2",
        "prompt": f"Context: {context}\n\nQuestion: {question}",
        "stream": False
    }
)
```

**Pros:**
- Zero API costs
- Complete privacy (data never leaves your machine)
- No rate limits

**Cons:**
- Requires decent hardware (Apple Silicon M1+ recommended)
- Slightly lower quality than cloud models
- You manage infrastructure

---

## RAG Architecture Best Practices

### 1. Document Chunking Strategies

#### Optimal Chunk Sizes by Content Type

| Content Type | Recommended Size | Overlap | Strategy |
|--------------|------------------|---------|----------|
| Resume/Bio | 256-512 tokens | 10-15% | Recursive by section |
| Project descriptions | 400-600 tokens | 15-20% | Paragraph-based |
| Technical docs/code | 256-512 tokens | 20% | Language-aware recursive |
| FAQs | No chunking | N/A | Document-level |
| Blog posts | 512-1024 tokens | 20% | Section-based |

#### Why Chunk Size Matters

- **Too Small (<128 tokens):** Loses context, fragments meaning
- **Too Large (>1024 tokens):** Adds noise, dilutes relevance signal
- **Sweet Spot (256-512 tokens):** Balances precision and context

Research findings:
- NVIDIA 2024 study: Page-level chunking achieved 0.648 accuracy
- Chroma Research: RecursiveCharacterTextSplitter at 400 tokens achieved 88-89% recall
- Query type matters: Factoid queries work best with 256-512 tokens; analytical queries need 1024+

#### Overlap Strategies

**Why Overlap Matters:**
- Prevents information loss at chunk boundaries
- Maintains semantic continuity
- Helps when relevant info spans two chunks

**Recommendations:**
- **10-20% overlap:** Standard for most use cases
- **Up to 30%:** For context-heavy documents (diminishing returns beyond this)
- **Example:** 512-token chunk with 20% overlap = 100-token overlap

```python
# LangChain RecursiveCharacterTextSplitter Example
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,        # Target chunk size in characters
    chunk_overlap=100,     # 20% overlap
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""]  # Priority order
)

chunks = splitter.split_text(document_text)
```

#### Recursive vs Fixed-Size Chunking

**Fixed-Size Chunking:**
```python
# Simple but can break mid-sentence
chunks = [text[i:i+500] for i in range(0, len(text), 500)]
```
- Pros: Simple, consistent chunk sizes
- Cons: Ignores semantic boundaries, can split sentences

**Recursive Chunking (Recommended):**
```python
# Respects document structure
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=100,
    separators=[
        "\n\n",    # First try: paragraph breaks
        "\n",      # Then: line breaks
        ". ",      # Then: sentences
        ", ",      # Then: clauses
        " ",       # Then: words
        ""         # Finally: characters
    ]
)
```
- Pros: Preserves semantic units, respects document structure
- Cons: Slightly more complex, variable chunk sizes

**Recommendation:** Use RecursiveCharacterTextSplitter for 80% of use cases. It handles most text well and balances simplicity with structure awareness.

---

### 2. Retrieval Strategies

#### k-NN (k-Nearest Neighbors) Retrieval

The standard approach for vector similarity search:

```python
# Using a vector database (e.g., Pinecone, Weaviate, Chroma)
results = vector_db.query(
    query_embedding,
    top_k=5,  # Number of chunks to retrieve
    include_metadata=True
)
```

#### Optimal k Value (Number of Chunks)

**Research Findings:**
- **k=4-6** is optimal for most RAG applications
- **k=4** best for latency-sensitive applications
- Latency scales quickly with increasing k

**Guidelines:**
- Start with k=4 for simple Q&A
- Increase to k=6-8 for complex queries
- Never exceed what fits in your context window

```python
# Dynamic k based on query complexity
def get_k_value(query: str) -> int:
    # Simple heuristic: longer queries may need more context
    if len(query.split()) > 20:
        return 6
    return 4
```

#### Hybrid Retrieval (Recommended)

Combines dense (semantic) and sparse (keyword) search:

```python
# Hybrid search example with Weaviate
results = client.query.get("Document", ["content", "metadata"])\
    .with_hybrid(
        query="What projects has the user worked on?",
        alpha=0.75  # 0=keyword only, 1=vector only
    )\
    .with_limit(5)\
    .do()
```

IBM Research (2024) found that combining vector search, sparse vector search, and full-text search achieves optimal recall.

#### Re-Ranking Strategies

Use a stronger model to re-score initial results:

```python
# Two-stage retrieval with re-ranking
from sentence_transformers import CrossEncoder

# Stage 1: Fast retrieval (get more candidates)
candidates = vector_db.query(query_embedding, top_k=20)

# Stage 2: Re-rank with cross-encoder
reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
pairs = [[query, doc.content] for doc in candidates]
scores = reranker.predict(pairs)

# Take top 5 after re-ranking
reranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)[:5]
```

**Benefits:** 15% improvement in retrieval precision (per 2024 research)

#### MMR (Maximal Marginal Relevance)

Balances relevance with diversity to avoid redundant results:

```python
# MMR example with LangChain
from langchain.vectorstores import Chroma

retriever = vectorstore.as_retriever(
    search_type="mmr",
    search_kwargs={
        "k": 5,
        "lambda_mult": 0.7  # 0=max diversity, 1=max relevance
    }
)
```

**Use Case:** When your portfolio has similar projects, MMR ensures diverse context.

---

### 3. Prompt Engineering for RAG

#### System Prompt Best Practices

```python
SYSTEM_PROMPT = """You are a helpful assistant for Zach Hixson's portfolio website.
Your role is to answer questions about Zach's experience, projects, skills, and background.

INSTRUCTIONS:
1. Answer questions using ONLY the provided context
2. If the context doesn't contain enough information, say "I don't have specific information about that in my knowledge base, but I can tell you about [related topic]"
3. Be conversational and friendly
4. Keep responses concise (2-3 paragraphs max)
5. When mentioning projects or experiences, be specific with details from the context

STYLE:
- First person when speaking as the assistant
- Professional but approachable tone
- Use bullet points for lists of skills or projects
"""
```

#### Context Formatting

**XML Tags (Recommended for Claude):**
```python
prompt = f"""<context>
{retrieved_chunks}
</context>

<question>
{user_question}
</question>

Based on the context above, please answer the question. If the context doesn't contain relevant information, acknowledge this and offer to help with related topics."""
```

**Markdown Headers (Works well for GPT):**
```python
prompt = f"""## Retrieved Context

{retrieved_chunks}

---

## User Question

{user_question}

---

Please answer based on the context provided above."""
```

**Structured Chunks with Metadata:**
```python
def format_chunks(chunks: list) -> str:
    formatted = []
    for i, chunk in enumerate(chunks, 1):
        formatted.append(f"""[Source {i}]
Type: {chunk.metadata.get('type', 'general')}
Content: {chunk.content}
""")
    return "\n".join(formatted)
```

#### Handling Missing Context

```python
FALLBACK_INSTRUCTION = """
If the provided context does not contain information to answer the question:
1. Explicitly state: "I don't have specific information about that."
2. Suggest related topics you CAN answer based on the context
3. Never make up information not present in the context
4. Offer to help with a different question

Example response when context is insufficient:
"I don't have specific details about [topic] in my knowledge base. However, I can tell you about [related project/skill] if that would be helpful. Is there something else about my background you'd like to know?"
"""
```

#### Complete RAG Prompt Template

```python
def build_rag_prompt(question: str, chunks: list) -> str:
    context = format_chunks(chunks)

    return f"""You are a helpful portfolio assistant. Answer questions about the portfolio owner's experience, projects, and background.

<rules>
- Use ONLY the provided context to answer
- If information is not in the context, say so clearly
- Be specific and cite relevant details
- Keep responses concise and conversational
</rules>

<context>
{context}
</context>

<question>
{question}
</question>

Provide a helpful, accurate response based on the context above."""
```

---

### 4. Context Window Management

#### Token Budget Allocation

For a 128K context window model, allocate:
- **System prompt:** ~500 tokens
- **Retrieved context:** ~2,000-4,000 tokens (4-6 chunks)
- **User question:** ~100 tokens
- **Response buffer:** ~500-1,000 tokens
- **Safety margin:** Stay under 80% of limit

```python
def calculate_token_budget(model_context_limit: int) -> dict:
    safe_limit = int(model_context_limit * 0.8)
    return {
        "system_prompt": 500,
        "retrieved_context": safe_limit - 2100,  # Bulk of budget
        "user_input": 100,
        "response_buffer": 1000,
        "total_available": safe_limit
    }
```

#### Fitting Chunks Within Limits

```python
import tiktoken

def fit_chunks_to_budget(chunks: list, budget: int, model: str = "gpt-4") -> list:
    encoding = tiktoken.encoding_for_model(model)

    selected_chunks = []
    current_tokens = 0

    for chunk in chunks:
        chunk_tokens = len(encoding.encode(chunk.content))
        if current_tokens + chunk_tokens <= budget:
            selected_chunks.append(chunk)
            current_tokens += chunk_tokens
        else:
            break  # Stop when budget exceeded

    return selected_chunks
```

#### Summarization Strategies

**When to Summarize:**
- Retrieved chunks exceed token budget
- Multiple highly-relevant chunks need consolidation
- Conversation history grows too long

**Progressive Summarization:**
```python
def progressive_summarize(chunks: list, max_tokens: int, llm) -> str:
    """Summarize chunks if they exceed token budget."""
    total_content = "\n\n".join([c.content for c in chunks])

    if count_tokens(total_content) <= max_tokens:
        return total_content

    # Summarize with LLM
    summary_prompt = f"""Summarize the following information, preserving all key facts,
projects, skills, and specific details. Keep technical terms and proper nouns.

Content to summarize:
{total_content}

Provide a concise summary (max {max_tokens} tokens):"""

    return llm.generate(summary_prompt)
```

**Chunk Consolidation:**
```python
def consolidate_chunks(chunks: list) -> str:
    """Remove redundancy when chunks have overlap."""
    seen_sentences = set()
    consolidated = []

    for chunk in chunks:
        sentences = chunk.content.split('. ')
        for sentence in sentences:
            sentence_hash = hash(sentence.strip().lower())
            if sentence_hash not in seen_sentences:
                seen_sentences.add(sentence_hash)
                consolidated.append(sentence)

    return '. '.join(consolidated)
```

---

## Recommendations

### For Your Portfolio Q&A System (100-1,000 queries/month)

#### Tier 1: Best Value (Recommended)

**LLM:** Google Gemini 1.5 Flash or GPT-4o-mini
- **Cost:** $0.04-0.15/month
- **Quality:** Excellent for Q&A tasks
- **Latency:** Sub-second responses

**RAG Configuration:**
- Chunk size: 400-500 tokens
- Overlap: 20% (80-100 tokens)
- Retrieval: k=4-5 chunks
- Strategy: RecursiveCharacterTextSplitter

```python
# Recommended stack
llm = "gemini-1.5-flash"  # or "gpt-4o-mini"
chunk_size = 450
chunk_overlap = 90
retrieval_k = 4
```

#### Tier 2: Speed Priority

**LLM:** Groq (Llama 3.3 70B)
- **Cost:** $0.30-0.50/month
- **Latency:** Best-in-class via LPU hardware
- **Quality:** Near GPT-4 level

Best for: Real-time chat UX where every millisecond matters.

#### Tier 3: Privacy/Free

**LLM:** Ollama with Llama 3.2 8B
- **Cost:** $0/month (hardware only)
- **Quality:** Good for straightforward Q&A
- **Requirement:** Apple Silicon Mac or decent GPU

Best for: Complete data privacy, offline operation, no API costs.

### Architecture Summary

```
User Question
     |
     v
+--------------------+
|  Query Processing  |  (optional: query expansion)
+--------------------+
     |
     v
+--------------------+
|  Vector Search     |  k=4-5 chunks, hybrid retrieval
|  (Embedding + DB)  |
+--------------------+
     |
     v
+--------------------+
|  Re-ranking        |  (optional: cross-encoder)
+--------------------+
     |
     v
+--------------------+
|  Context Fitting   |  Token budget management
+--------------------+
     |
     v
+--------------------+
|  Prompt Assembly   |  System + Context + Question
+--------------------+
     |
     v
+--------------------+
|  LLM Generation    |  Gemini/GPT-4o-mini/Groq
+--------------------+
     |
     v
    Response
```

### Cost Comparison (500 queries/month, ~1K tokens each)

| Solution | Monthly Cost | Notes |
|----------|--------------|-------|
| Gemini 1.5 Flash | ~$0.04-0.08 | Cheapest cloud option |
| GPT-4o-mini | ~$0.08-0.15 | Best quality/price balance |
| Together AI GPT-OSS | ~$0.08-0.15 | Open-source alternative |
| Claude 3 Haiku | ~$0.12-0.25 | Largest context window |
| Groq Llama 70B | ~$0.30-0.50 | Fastest inference |
| Ollama (local) | $0 | Requires local hardware |

---

## Sources

- [OpenAI Pricing](https://openai.com/api/pricing/)
- [Anthropic Claude Pricing](https://www.anthropic.com/pricing)
- [Google Gemini Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Groq Pricing](https://groq.com/pricing)
- [Together AI Pricing](https://www.together.ai/pricing)
- [Fireworks AI Pricing](https://fireworks.ai/pricing)
- [Ollama Library](https://ollama.com/library)
- [Chunking Best Practices - Unstructured](https://unstructured.io/blog/chunking-for-rag-best-practices)
- [RAG Chunking Strategies - Weaviate](https://weaviate.io/blog/chunking-strategies-for-rag)
- [LLM API Pricing Comparison 2025](https://intuitionlabs.ai/articles/llm-api-pricing-comparison-2025)
- [Advanced RAG Techniques - Neo4j](https://neo4j.com/blog/genai/advanced-rag-techniques/)
- [Context Window Management - GetMaxim](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/)
