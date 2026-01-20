# Portfolio RAG Backend

FastAPI backend providing RAG-based Q&A for the portfolio AI guide.

## Setup

### 1. Create virtual environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### 4. Add documents to vector database

```bash
# Add a single document
python vectorize.py --add ../docs/resume.md

# Add all documents from a directory
python vectorize.py --add-dir ../portfolio_content/

# List documents in database
python vectorize.py --list

# Test a query
python vectorize.py --query "What experience does Zach have?"
```

### 5. Run the server

```bash
# Development (with auto-reload)
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --port 8000
```

## API Endpoints

### POST /api/ask
Ask a question and get a response.

```json
{
  "question": "What projects has Zach worked on?",
  "chat_history": [
    {"role": "user", "content": "Previous question"},
    {"role": "assistant", "content": "Previous answer"}
  ]
}
```

Response:
```json
{
  "response": "Based on the portfolio...",
  "sources": [
    {
      "content": "Relevant chunk...",
      "metadata": {"source": "projects.md"},
      "similarity": 0.87
    }
  ]
}
```

### POST /api/ask/stream
Same as above but returns Server-Sent Events for streaming responses.

### POST /api/sources
Get the sources that would be retrieved for a question (without generating a response).

### GET /api/collection
Get information about the vector database collection.

### GET /health
Health check endpoint.

## Configuration

All configuration is done through environment variables. See `.env.example` for available options.

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `ALLOWED_ORIGINS` | CORS origins | `http://localhost:3000` |
| `PORT` | Server port | `8000` |
| `EMBEDDING_MODEL` | Embedding model | `sentence-transformers/all-MiniLM-L6-v2` |
| `LLM_MODEL` | LLM model | `gpt-4o-mini` |
| `CHUNK_SIZE` | Chunk size in tokens | `450` |
| `CHUNK_OVERLAP` | Overlap in tokens | `90` |
| `RETRIEVAL_K` | Number of chunks to retrieve | `5` |

## Project Structure

```
backend/
├── main.py              # FastAPI application
├── config.py            # Configuration settings
├── vectorize.py         # CLI tool for adding documents
├── requirements.txt     # Python dependencies
├── routers/
│   └── rag.py          # RAG API endpoints
├── services/
│   ├── embedding_service.py  # Embedding generation
│   ├── vector_db.py         # ChromaDB operations
│   ├── llm_service.py       # OpenAI LLM
│   └── rag_service.py       # RAG pipeline
└── utils/
    └── text_splitter.py     # Document chunking
```
