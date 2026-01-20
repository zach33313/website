# AI Guide Character - Research & Implementation Document

## Project Overview
Create an interactive AI-powered guide character for the portfolio website that can answer questions about Zach's experience, projects, and background using RAG (Retrieval Augmented Generation).

## Research Status
- [x] Embedding Models Research - **Complete**
- [x] Vector Database Research - **Complete**
- [x] LLM/Response Generation Research - **Complete**
- [x] RAG Architecture Research - **Complete**
- [x] Frontend Components Research - **Complete**
- [x] Backend Infrastructure Research - **Complete**
- [x] Cost Analysis - **Complete**

---

# EXECUTIVE SUMMARY

## Recommended Technology Stack

| Component | Recommendation | Cost | Rationale |
|-----------|---------------|------|-----------|
| **Embedding Model** | sentence-transformers/all-MiniLM-L6-v2 | FREE | Local, fast, sufficient quality for 100-500 docs |
| **Vector Database** | ChromaDB | FREE | Simplest setup, built for RAG, persistent storage |
| **LLM** | GPT-4o-mini | ~$0.10-0.20/mo | Best quality/cost ratio, reliable, fast |
| **Backend** | Python + FastAPI | $5-6/mo VPS | Best AI/ML ecosystem, no cold starts |
| **Frontend** | SVG + CSS Animation | FREE | Lightweight, full theme control |
| **Hosting** | DigitalOcean VPS + Vercel | $5-6/mo | Simple, reliable, cost-effective |

## Total Estimated Monthly Cost: **$5-7/month**

---

## 1. Embedding Models Research

### Recommendation: **sentence-transformers/all-MiniLM-L6-v2**

| Attribute | Value |
|-----------|-------|
| Cost | FREE (open source) |
| Dimensions | 384 |
| MTEB Score | ~56% |
| Size | ~90MB |
| Speed | 3-6 seconds per document |

### Why This Choice
1. **Free** - No API costs, perfect for cost-conscious deployment
2. **Local** - Works offline, no data privacy concerns
3. **Fast** - Small model, quick inference
4. **Sufficient Quality** - ~56% MTEB is adequate for 100-500 documents
5. **Easy** - `pip install sentence-transformers`, simple Python API

### Alternative (if higher quality needed)
- **OpenAI text-embedding-3-small**: $0.02/1M tokens (negligible cost)
- **Jina AI**: Free tier of 10M tokens

### Full Research: [research-embeddings-vectordb.md](./research-embeddings-vectordb.md)

---

## 2. Vector Database Research

### Recommendation: **ChromaDB**

| Attribute | Value |
|-----------|-------|
| Cost | FREE (Apache 2.0) |
| Setup | `pip install chromadb` |
| Persistence | Automatic to disk |
| SDK | Python, JavaScript, Ruby, PHP, Java |

### Why This Choice
1. **Simplest setup** - One pip install and you're done
2. **Built for RAG** - Designed specifically for this use case
3. **Built-in embeddings** - Integrates with sentence-transformers
4. **Persistent** - Saves to disk automatically
5. **Scales to 10M vectors** - Far more than needed

### Code Example
```python
import chromadb
client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("portfolio_docs")
```

### Full Research: [research-embeddings-vectordb.md](./research-embeddings-vectordb.md)

---

## 3. LLM for Response Generation

### Recommendation: **GPT-4o-mini**

| Attribute | Value |
|-----------|-------|
| Input Cost | $0.15/1M tokens |
| Output Cost | $0.60/1M tokens |
| Context Window | 128K tokens |
| Quality | Excellent for Q&A |
| Latency | ~0.3-0.6s time-to-first-token |

### Monthly Cost Estimate (500 queries)
- ~$0.10-0.20/month

### Why This Choice
1. **Best quality/cost ratio** - Better than GPT-3.5-turbo, 60% cheaper
2. **Reliable** - Mature API, excellent documentation
3. **Fast** - Sub-second first token
4. **Large context** - 128K tokens is more than enough

### Alternatives
- **Gemini 1.5 Flash**: $0.075/$0.30 (cheaper, good quality)
- **Groq Llama 3.3 70B**: $0.59/$0.99 (fastest inference)
- **Local Ollama**: FREE but requires hardware

### Full Research: [research-llm-rag.md](./research-llm-rag.md)

---

## 4. RAG Architecture Research

### Chunking Strategy
| Parameter | Recommendation |
|-----------|---------------|
| Chunk Size | 400-500 tokens |
| Overlap | 20% (80-100 tokens) |
| Strategy | RecursiveCharacterTextSplitter |
| Separators | `["\n\n", "\n", ". ", " ", ""]` |

### Retrieval Configuration
| Parameter | Recommendation |
|-----------|---------------|
| k (chunks) | 4-5 |
| Algorithm | Cosine similarity |
| Search Type | MMR for diversity |

### Prompt Template
```python
SYSTEM_PROMPT = """You are a helpful assistant for Zach Hixson's portfolio website.
Your role is to answer questions about Zach's experience, projects, skills, and background.

INSTRUCTIONS:
1. Answer questions using ONLY the provided context
2. If the context doesn't contain enough information, say so clearly
3. Be conversational and friendly
4. Keep responses concise (2-3 paragraphs max)
"""
```

### Full Research: [research-llm-rag.md](./research-llm-rag.md)

---

## 5. Frontend Components

### Character Animation: **SVG + CSS**

**Approach:**
1. Simple stick figure SVG with grouped body parts
2. CSS keyframe animations for states:
   - **Idle**: Subtle breathing/sway
   - **Speaking**: Head bob + brighter glow
   - **Thinking**: Pulsing glow
   - **Attention**: Scale pulse when chat closed

### Chat Widget Structure
```
ChatWidget/
├── ChatWidget.js          # Main container
├── ChatWidget.css         # Styles (matrix theme)
├── AICharacter.js         # SVG character
├── ChatHeader.js          # Title + close button
├── ChatMessages.js        # Message list
├── ChatInput.js           # Input + send
├── TypingIndicator.js     # Animated dots
├── ExampleQuestions.js    # Prompt chips
└── useChatState.js        # State hook
```

### Key Styling
- Fixed position bottom-right
- Matrix green (#00ff41) theme
- Scanline overlay effect
- Terminal-style prefixes (`> `)
- Neon glow effects

### Full Research: [research-frontend-ui.md](./research-frontend-ui.md)

---

## 6. Backend Infrastructure

### Recommendation: **Python + FastAPI on VPS**

| Component | Choice |
|-----------|--------|
| Framework | FastAPI |
| Process Manager | systemd |
| Reverse Proxy | Nginx |
| SSL | Let's Encrypt |
| Hosting | DigitalOcean ($6/mo) |

### Why Not Serverless
1. Cold starts (6-7 seconds) create poor UX
2. Size limits (250MB) restrict AI libraries
3. AWS Lambda cold start costs increased 22x in 2025
4. A VPS provides more control at same/lower cost

### Project Structure
```
backend/
├── main.py                 # FastAPI application
├── requirements.txt        # Dependencies
├── .env                    # Environment variables
├── routers/rag.py          # RAG endpoints
├── services/
│   ├── embeddings.py       # Embedding generation
│   ├── vector_db.py        # Vector database ops
│   └── llm.py              # LLM interaction
└── utils/
    ├── rate_limiter.py     # Rate limiting
    └── validators.py       # Input validation
```

### Full Research: [research-infrastructure.md](./research-infrastructure.md)

---

## 7. Cost Analysis

### Recommended Setup: ~$5-7/month

| Component | Monthly Cost |
|-----------|--------------|
| Embedding Model (local) | $0 |
| LLM (GPT-4o-mini, 500 queries) | $0.10-0.20 |
| Vector DB (ChromaDB local) | $0 |
| VPS (DigitalOcean) | $6 |
| Frontend (Vercel free) | $0 |
| **Total** | **$6.10-6.20** |

### Budget Alternative: ~$0.02-0.04/month
- Use Groq Llama instead of GPT-4o-mini
- Use Vercel/Netlify free tier instead of VPS
- Trade-off: Serverless cold starts

### Full Research: [research-costs.md](./research-costs.md)

---

## 8. Implementation Plan

### Phase 1: Backend Infrastructure (Local Development)
1. [ ] Create Python virtual environment
2. [ ] Set up FastAPI application with basic endpoints
3. [ ] Implement ChromaDB integration
4. [ ] Create document ingestion/vectorization script
5. [ ] Implement RAG logic with LangChain
6. [ ] Add streaming response support
7. [ ] Test locally with sample documents

### Phase 2: Vectorization Tooling
1. [ ] Create CLI script for document vectorization
2. [ ] Support markdown, text, code files
3. [ ] Implement configurable chunking
4. [ ] Add progress tracking and logging
5. [ ] Create update/re-vectorize capability

### Phase 3: Frontend Components
1. [ ] Create AICharacter SVG component with animations
2. [ ] Build ChatWidget container component
3. [ ] Implement ChatMessages with streaming support
4. [ ] Create ChatInput with keyboard handling
5. [ ] Add TypingIndicator component
6. [ ] Implement ExampleQuestions prompt chips
7. [ ] Style with Matrix/cyberpunk theme
8. [ ] Add mobile responsive handling

### Phase 4: Integration
1. [ ] Connect frontend to backend API
2. [ ] Implement SSE streaming in React
3. [ ] Add error handling and retry logic
4. [ ] Test end-to-end locally

### Phase 5: Production Deployment
1. [ ] Set up DigitalOcean Droplet
2. [ ] Configure Nginx reverse proxy
3. [ ] Set up Let's Encrypt SSL
4. [ ] Configure systemd service
5. [ ] Deploy backend
6. [ ] Configure CORS for production
7. [ ] Deploy frontend to Vercel
8. [ ] End-to-end production testing

### Phase 6: Content & Polish
1. [ ] Vectorize all portfolio content (resume, projects, skills)
2. [ ] Test with real questions
3. [ ] Tune RAG parameters as needed
4. [ ] Add rate limiting
5. [ ] Set up logging and monitoring

---

## 9. Vectorization Tooling Design

### CLI Tool: `vectorize.py`

```bash
# Usage examples
python vectorize.py --add ./docs/resume.md
python vectorize.py --add-dir ./portfolio_content/
python vectorize.py --update ./docs/projects.md
python vectorize.py --list
python vectorize.py --clear
```

### Supported File Types
- Markdown (`.md`)
- Plain text (`.txt`)
- Code files (`.py`, `.js`, `.ts`, etc.)
- JSON (`.json`)

### Configuration
```python
CHUNK_SIZE = 450
CHUNK_OVERLAP = 90
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
CHROMA_DB_PATH = "./chroma_db"
COLLECTION_NAME = "portfolio_docs"
```

### Features
- Progress bar for large document sets
- Metadata tagging (document type, source file)
- Duplicate detection
- Dry-run mode for testing

---

## Research Documents

All detailed research is available in separate documents:

1. **[research-embeddings-vectordb.md](./research-embeddings-vectordb.md)** - Embedding models and vector database comparison
2. **[research-llm-rag.md](./research-llm-rag.md)** - LLM providers and RAG architecture best practices
3. **[research-infrastructure.md](./research-infrastructure.md)** - Backend frameworks and deployment options
4. **[research-costs.md](./research-costs.md)** - Comprehensive cost analysis
5. **[research-frontend-ui.md](./research-frontend-ui.md)** - Frontend components and animation patterns

---

*Research compiled: January 2026*

