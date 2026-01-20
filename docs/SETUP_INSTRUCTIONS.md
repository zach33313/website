# Setup Instructions for AI Guide Character & Vectorization Tool

This document outlines all the steps needed to get the vectorization service and RAG-powered chat widget online.

---

## Prerequisites

### Required Software
- **Python 3.9+** - for backend services
- **Node.js 18+** - for frontend applications
- **pip** - Python package manager

### API Keys Required
1. **OpenAI API Key** - Required for LLM responses in the chat widget
   - Get it from: https://platform.openai.com/api-keys
   - Cost: ~$0.002-0.06 per 1K tokens depending on model

---

## 1. RAG Backend Setup (Portfolio Chat)

The RAG backend powers the AI chat widget on your portfolio.

### Installation

```bash
# Navigate to backend directory
cd /Users/zachhixson/website/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Configuration

Create a `.env` file in the `backend` directory:

```env
# Required
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional (defaults shown)
EMBEDDING_MODEL=all-MiniLM-L6-v2
LLM_MODEL=gpt-4o-mini
CHROMA_PERSIST_DIR=./chroma_db
COLLECTION_NAME=portfolio_docs
```

### Vectorize Your Content

Before running the server, you need to add your portfolio content to the vector database:

```bash
# Add sample content (already created)
python vectorize.py add ../portfolio_content/about.md
python vectorize.py add ../portfolio_content/projects.md
python vectorize.py add ../portfolio_content/contact.md

# Or add all content from a directory
python vectorize.py add ../portfolio_content/

# List indexed documents
python vectorize.py list

# Test a query
python vectorize.py query "What are Zach's skills?"
```

### Running the Server

```bash
# Start the RAG server (default port 8000)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# The API will be available at:
# - http://localhost:8000/api/ask (non-streaming)
# - http://localhost:8000/api/ask/stream (SSE streaming)
# - http://localhost:8000/docs (API documentation)
```

### Deployment Considerations

For production deployment:

1. **Option A: Railway/Render/Fly.io**
   - Push to GitHub and connect the repository
   - Set environment variables in the dashboard
   - Use `uvicorn main:app --host 0.0.0.0 --port $PORT`

2. **Option B: Docker**
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

3. **Update Frontend API URL**
   - Set `REACT_APP_RAG_API_URL` environment variable
   - Or update the default in `ChatWidget.js`

---

## 2. Vectorization Tool Setup

The Vectorization Insight Tool is a standalone web application for visualizing text embeddings.

### Backend Setup

```bash
# Navigate to vectorization tool backend
cd /Users/zachhixson/website/vectorization-tool/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Note**: First run may take a few minutes to download embedding models (~100MB).

Create `.env` file:

```env
# Optional - defaults work for local development
DEFAULT_EMBEDDING_MODEL=all-MiniLM-L6-v2
DEFAULT_CHUNK_SIZE=512
DEFAULT_CHUNK_OVERLAP=50
```

Run the backend:

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd /Users/zachhixson/website/vectorization-tool/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5174` and proxies API requests to the backend.

### Building for Production

```bash
# Build the frontend
npm run build

# Serve the dist folder with any static server
npx serve dist
```

---

## 3. Portfolio Website Integration

The chat widget is already integrated into your portfolio. To configure it:

### Environment Variables

Create a `.env` file in `/Users/zachhixson/website/`:

```env
REACT_APP_RAG_API_URL=http://localhost:8000
```

For production, set this to your deployed backend URL.

### Running the Portfolio

```bash
cd /Users/zachhixson/website
npm install
npm start
```

---

## 4. Things You Need to Do

### Immediate Setup (Required)

1. **Get OpenAI API Key**
   - Sign up at https://platform.openai.com
   - Create an API key
   - Add billing information ($5 minimum)
   - Add to `.env` as `OPENAI_API_KEY`

2. **Install Python Dependencies**
   ```bash
   # RAG Backend
   cd backend && pip install -r requirements.txt

   # Vectorization Tool Backend
   cd ../vectorization-tool/backend && pip install -r requirements.txt
   ```

3. **Download Embedding Models** (happens automatically on first run)
   - `all-MiniLM-L6-v2` (~90MB)
   - `all-mpnet-base-v2` (~420MB, optional)

4. **Create Your Portfolio Content**
   - Update files in `portfolio_content/` with your actual information
   - Re-run vectorization to index new content

### Optional Configuration

1. **Custom Embedding Models**
   - Edit model configurations in `embedding_service.py`
   - Add OpenAI embeddings for higher quality (requires API key)

2. **Vector Database Persistence**
   - ChromaDB persists by default to `./chroma_db`
   - Configure `CHROMA_PERSIST_DIR` for custom location

3. **LLM Configuration**
   - Default is `gpt-4o-mini` (cheap, fast)
   - Change to `gpt-4o` for higher quality responses
   - Configure in `.env` as `LLM_MODEL`

---

## 5. Estimated Costs

### OpenAI API (Required for Chat)

| Model | Input Cost | Output Cost | Monthly Estimate* |
|-------|-----------|-------------|-------------------|
| gpt-4o-mini | $0.15/1M | $0.60/1M | ~$0.50-2.00 |
| gpt-4o | $2.50/1M | $10.00/1M | ~$5.00-20.00 |

*Based on ~100-500 chat interactions/month

### Embedding Generation (Free)

- Local models (sentence-transformers): Free
- OpenAI embeddings: $0.02-0.13 per 1M tokens

### Hosting (Optional)

| Platform | Free Tier | Paid |
|----------|-----------|------|
| Railway | 500 hrs/month | $5/month |
| Render | Static sites free | $7/month for services |
| Vercel | Frontend free | - |
| Fly.io | 3 VMs free | $5/month |

---

## 6. Quick Start Commands

```bash
# Start RAG Backend
cd /Users/zachhixson/website/backend
source venv/bin/activate
uvicorn main:app --port 8000 --reload

# In a new terminal - Start Vectorization Tool Backend
cd /Users/zachhixson/website/vectorization-tool/backend
source venv/bin/activate
uvicorn main:app --port 8001 --reload

# In a new terminal - Start Vectorization Tool Frontend
cd /Users/zachhixson/website/vectorization-tool/frontend
npm run dev

# In a new terminal - Start Portfolio Website
cd /Users/zachhixson/website
npm start
```

---

## 7. Troubleshooting

### Common Issues

1. **"ModuleNotFoundError: No module named 'sentence_transformers'"**
   - Run `pip install sentence-transformers`

2. **"torch not found" errors**
   - Run `pip install torch` (CPU version is fine)

3. **CORS errors in browser**
   - Ensure backend is running on correct port
   - Check CORS settings in `main.py`

4. **Chat not connecting**
   - Verify RAG backend is running on port 8000
   - Check browser console for errors
   - Verify `REACT_APP_RAG_API_URL` is set correctly

5. **Slow first embedding**
   - First run downloads model files (~100MB)
   - Subsequent runs will be faster

---

## 8. File Structure Reference

```
website/
├── backend/                    # RAG Backend (port 8000)
│   ├── main.py                # FastAPI app
│   ├── config.py              # Configuration
│   ├── vectorize.py           # CLI tool for document management
│   ├── requirements.txt       # Python dependencies
│   ├── services/              # Business logic
│   │   ├── embedding_service.py
│   │   ├── vector_db.py
│   │   ├── llm_service.py
│   │   └── rag_service.py
│   └── routers/               # API endpoints
│       └── rag.py
│
├── vectorization-tool/         # Vectorization Insight Tool
│   ├── backend/               # (port 8001)
│   │   ├── main.py
│   │   ├── services/          # Chunking, embedding, visualization
│   │   └── routers/           # API endpoints
│   └── frontend/              # React app (port 5174)
│       ├── src/
│       │   ├── components/    # UI components
│       │   ├── stores/        # Zustand store
│       │   └── services/      # API client
│       └── package.json
│
├── portfolio_content/          # Documents to vectorize
│   ├── about.md
│   ├── projects.md
│   └── contact.md
│
├── src/                        # Portfolio React app
│   ├── components/
│   │   ├── ChatWidget.js      # AI chat widget
│   │   └── ChatWidget.css
│   └── App.js
│
└── docs/
    └── SETUP_INSTRUCTIONS.md  # This file
```

---

## Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all environment variables are set
3. Check the terminal for error messages
4. Ensure all dependencies are installed

The services are designed to work locally for development. For production, you'll need to deploy the backends to a cloud provider and update the frontend API URLs accordingly.
