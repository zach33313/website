# Backend Infrastructure Research for RAG-Powered Q&A Feature

**Last Updated:** January 2026
**Project:** React Portfolio Website with RAG Q&A Feature

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Backend Framework Options](#backend-framework-options)
   - [Node.js with Express](#option-1-nodejs-with-express)
   - [Python with FastAPI](#option-2-python-with-fastapi)
3. [Serverless Options](#serverless-options)
   - [Vercel Serverless Functions](#vercel-serverless-functions)
   - [Netlify Functions](#netlify-functions)
   - [AWS Lambda](#aws-lambda)
4. [VM Deployment Options](#vm-deployment-options)
5. [Security Best Practices](#security-best-practices)
6. [Architecture Patterns](#architecture-patterns)
7. [Recommended Architecture](#recommended-architecture)
8. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

For a portfolio website with a RAG-powered Q&A feature, **Python with FastAPI deployed on a minimal VPS** is the recommended approach for the following reasons:

- **Better ML/AI ecosystem**: LangChain, vector databases, and embedding libraries have first-class Python support
- **Cost-effective**: A $5-6/month VPS provides full control without serverless limitations
- **No cold starts**: Critical for AI workloads that can take seconds to initialize
- **Simple architecture**: Direct API calls from React frontend with streaming responses

**Estimated Monthly Cost:** $5-12/month (VPS + domain)

---

## Backend Framework Options

### Option 1: Node.js with Express

#### RAG API Endpoint Structure

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const { PineconeClient } = require('@pinecone-database/pinecone');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Initialize clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// RAG endpoint
app.post('/api/ask', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Invalid question' });
    }

    // 1. Generate embedding for the question
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2. Query vector database for relevant context
    const relevantDocs = await queryVectorDB(queryEmbedding);

    // 3. Generate response with context
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant answering questions about [Your Name]'s portfolio and experience. Use the following context to answer questions:\n\n${relevantDocs}`
        },
        { role: 'user', content: question }
      ],
      stream: true
    });

    // Stream response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('RAG Error:', error);
    res.status(500).json({ error: 'Failed to process question' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

#### Environment Variable Handling

```javascript
// config.js
require('dotenv').config();

module.exports = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  pineconeApiKey: process.env.PINECONE_API_KEY,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development'
};
```

```bash
# .env (never commit this file)
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000
PORT=3001
NODE_ENV=production
```

#### CORS Setup

```javascript
const cors = require('cors');

// Development: Allow all origins
const corsOptionsDev = {
  origin: true,
  credentials: true
};

// Production: Whitelist specific origins
const corsOptionsProd = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(process.env.NODE_ENV === 'production' ? corsOptionsProd : corsOptionsDev));
```

#### Pros and Cons

| Pros | Cons |
|------|------|
| Same language as React frontend | Weaker ML/AI library ecosystem |
| Large npm ecosystem | Most AI tutorials/examples are Python |
| Easy to deploy with PM2 | Async handling less intuitive than Python |
| Good for real-time with WebSockets | Vector DB clients often Python-first |

---

### Option 2: Python with FastAPI (Recommended)

#### RAG API Endpoint Structure

```python
# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Portfolio RAG API")

# CORS configuration - add middleware FIRST
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class QuestionRequest(BaseModel):
    question: str

class QuestionResponse(BaseModel):
    answer: str
    sources: list[str] = []

@app.post("/api/ask")
async def ask_question(request: QuestionRequest):
    """RAG endpoint for Q&A about portfolio"""

    if not request.question or len(request.question) > 1000:
        raise HTTPException(status_code=400, detail="Invalid question")

    # 1. Generate embedding for the question
    embedding_response = client.embeddings.create(
        model="text-embedding-3-small",
        input=request.question
    )
    query_embedding = embedding_response.data[0].embedding

    # 2. Query vector database (example with ChromaDB or similar)
    relevant_docs = await query_vector_db(query_embedding)

    # 3. Generate response with context
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": f"""You are a helpful assistant answering questions about
                [Your Name]'s portfolio, skills, and experience.
                Use the following context to answer questions:

                {relevant_docs}

                If you don't know the answer based on the context, say so politely."""
            },
            {"role": "user", "content": request.question}
        ]
    )

    return QuestionResponse(
        answer=completion.choices[0].message.content,
        sources=[]
    )

@app.post("/api/ask/stream")
async def ask_question_stream(request: QuestionRequest):
    """Streaming RAG endpoint for real-time responses"""

    async def generate():
        # Similar logic but with streaming
        stream = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "..."},
                {"role": "user", "content": request.question}
            ],
            stream=True
        )

        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield f"data: {chunk.choices[0].delta.content}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
```

#### Project Structure

```
backend/
├── main.py                 # FastAPI application
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables (not committed)
├── .env.example           # Template for environment variables
├── config.py              # Configuration management
├── routers/
│   └── rag.py            # RAG-specific endpoints
├── services/
│   ├── embeddings.py     # Embedding generation
│   ├── vector_db.py      # Vector database operations
│   └── llm.py            # LLM interaction
├── models/
│   └── schemas.py        # Pydantic models
└── utils/
    ├── rate_limiter.py   # Rate limiting
    └── validators.py     # Input validation
```

#### Requirements.txt

```
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
python-dotenv>=1.0.0
openai>=1.12.0
langchain>=0.1.0
langchain-openai>=0.0.5
chromadb>=0.4.22
pydantic>=2.5.0
slowapi>=0.1.8
```

#### Environment Variable Handling

```python
# config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    openai_api_key: str
    allowed_origins: str = "http://localhost:3000"
    port: int = 8000
    environment: str = "development"
    rate_limit: str = "10/minute"

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
```

#### CORS Setup (Production)

```python
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

# Add TrustedHost middleware for production (prevents host header attacks)
if os.getenv("ENVIRONMENT") == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["yourdomain.com", "*.yourdomain.com"]
    )

# CORS middleware must be added FIRST (before other middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=86400,  # Cache preflight for 24 hours
)
```

#### Pros and Cons

| Pros | Cons |
|------|------|
| Best-in-class AI/ML ecosystem | Different language from frontend |
| LangChain is Python-first | Slightly more complex deployment |
| Async support built-in | Need to manage Python environment |
| Excellent type hints with Pydantic | - |
| Auto-generated API docs (Swagger) | - |
| Better vector DB client support | - |

---

## Serverless Options

### Vercel Serverless Functions

#### Overview
- Integrates seamlessly with React/Next.js deployments
- Zero configuration for basic use cases
- Automatic HTTPS and global CDN

#### Limitations for RAG Workloads

| Limitation | Impact |
|------------|--------|
| 250MB uncompressed size limit | AI libraries often exceed this |
| 60s timeout (Hobby) / 300s (Pro) | Long RAG queries may timeout |
| Cold starts up to 6-7 seconds | Poor UX for first request |
| No persistent connections | Can't maintain vector DB connections |
| No WebSocket support | Limits real-time streaming options |

#### Pricing
- **Hobby (Free):** 100GB bandwidth, 60s timeout
- **Pro ($20/month):** 1TB bandwidth, 300s timeout, reduced cold starts
- **Enterprise:** 900s timeout, guaranteed no cold starts

#### Verdict: Not Recommended for RAG
Cold starts and size limits make this unsuitable for production AI workloads.

---

### Netlify Functions

#### Overview
- Similar to Vercel with good static site integration
- Credit-based pricing model (as of 2025)

#### Limitations
- Complex backend logic not well supported
- Credit system can lead to unpredictable costs
- Limited for AI/ML workloads

#### Pricing
- **Free:** 100GB bandwidth, limited compute credits
- **Pro ($19/user/month):** 1TB bandwidth, more credits
- AI inference costs additional based on model usage

#### Verdict: Not Recommended
Similar limitations to Vercel with less predictable pricing.

---

### AWS Lambda

#### Overview
- Most mature serverless platform
- Extensive ecosystem integration

#### 2025/2026 Changes (Important)
AWS began billing for the Lambda INIT phase in August 2025, significantly increasing cold start costs:

| Metric | Before | After |
|--------|--------|-------|
| Cost per million cold starts | ~$0.80 | ~$17.80 |
| Cost increase | - | 22x |

#### Limitations for RAG
- 15 minute maximum execution time
- Cold starts waste compute time (1-5 seconds you pay for)
- Loading ML models can cause 29+ second timeouts
- Requires provisioned concurrency ($$$) for consistent latency

#### Pricing
- Pay per invocation + duration
- Provisioned concurrency: ~$0.000004/GB-second (always-on cost)
- ARM64 (Graviton2): 20% cheaper than x86

#### Verdict: Possible but Complex
Can work with provisioned concurrency, but adds complexity and cost. Better suited for high-scale applications.

---

### Serverless Recommendation

**For a portfolio site: Avoid serverless for the RAG backend.**

Reasons:
1. Cold starts create poor user experience
2. Size limits restrict AI library usage
3. Costs can be unpredictable with AI workloads
4. A $5/month VPS provides more control and better performance

---

## VM Deployment Options

### VPS Provider Comparison

| Provider | Minimum Plan | RAM | Storage | Bandwidth | Notes |
|----------|-------------|-----|---------|-----------|-------|
| **Vultr** | $2.50/month | 512MB | 10GB | 0.5TB | Cheapest option |
| **DigitalOcean** | $6/month | 1GB | 25GB | 1TB | Best docs/community |
| **Linode (Akamai)** | $5/month | 1GB | 25GB | 1TB | 99.99% uptime SLA |
| **Hetzner** | ~$4/month | 2GB | 20GB | 20TB | Best value (EU) |

### Recommended: DigitalOcean or Linode ($5-6/month)
- 1GB RAM is sufficient for a simple RAG API
- Good documentation and community support
- Easy DNS and firewall management
- Free DDoS protection (DigitalOcean)

---

### Running the Backend as a Service

#### Option A: PM2 (Recommended for Node.js)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name "rag-api"

# Enable startup script (auto-restart on reboot)
pm2 startup
pm2 save

# Useful commands
pm2 logs rag-api
pm2 monit
pm2 restart rag-api
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'rag-api',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,  // Don't use watch in production
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
```

#### Option B: systemd (Recommended for Python/FastAPI)

```bash
# Create service file
sudo nano /etc/systemd/system/rag-api.service
```

```ini
[Unit]
Description=RAG API Service
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/rag-api
Environment="PATH=/var/www/rag-api/venv/bin"
EnvironmentFile=/var/www/rag-api/.env
ExecStart=/var/www/rag-api/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable rag-api
sudo systemctl start rag-api
sudo systemctl status rag-api

# View logs
sudo journalctl -u rag-api -f
```

#### Option C: Docker

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  rag-api:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

### SSL/HTTPS Setup with Let's Encrypt

#### Nginx Reverse Proxy Configuration

```bash
# Install Nginx and Certbot
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/rag-api
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # SSE support
        proxy_buffering off;
        proxy_read_timeout 86400;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/rag-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

---

## Security Best Practices

### 1. API Key Storage

#### Development
```bash
# .env file (add to .gitignore)
OPENAI_API_KEY=sk-...
```

#### Production Options

**Option A: Environment Variables (Simple)**
```bash
# Set in systemd service file or export in shell
export OPENAI_API_KEY="sk-..."
```

**Option B: Encrypted .env with dotenvx (Recommended)**
```bash
# Encrypt your .env file
npx dotenvx encrypt

# Decrypt at runtime
npx dotenvx run -- uvicorn main:app
```

**Option C: Secrets Manager (Enterprise)**
- AWS Secrets Manager
- HashiCorp Vault
- DigitalOcean App Platform secrets

### 2. Rate Limiting

#### FastAPI with SlowAPI

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/api/ask")
@limiter.limit("10/minute")  # 10 requests per minute per IP
async def ask_question(request: Request, question: QuestionRequest):
    ...
```

#### Express with express-rate-limit

```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);
```

### 3. Input Validation/Sanitization

```python
from pydantic import BaseModel, Field, validator
import re

class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)

    @validator('question')
    def sanitize_question(cls, v):
        # Remove potential injection patterns
        v = v.strip()
        # Remove excessive whitespace
        v = re.sub(r'\s+', ' ', v)
        # Basic XSS prevention (if echoing back)
        v = v.replace('<', '&lt;').replace('>', '&gt;')
        return v
```

### 4. Additional Security Headers

```python
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.gzip import GZipMiddleware

# Force HTTPS in production
if os.getenv("ENVIRONMENT") == "production":
    app.add_middleware(HTTPSRedirectMiddleware)

# Add security headers
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response
```

---

## Architecture Patterns

### Option A: Direct API Calls (Recommended for Portfolio)

```
┌─────────────────┐         ┌─────────────────┐
│                 │  HTTPS  │                 │
│  React Frontend │────────▶│   FastAPI RAG   │
│  (Vercel/CDN)   │◀────────│   (VPS)         │
│                 │   SSE   │                 │
└─────────────────┘         └────────┬────────┘
                                     │
                            ┌────────▼────────┐
                            │  OpenAI API     │
                            │  + Vector DB    │
                            └─────────────────┘
```

**Pros:**
- Simple architecture
- Easy to debug
- Lower latency
- Fewer moving parts

**Cons:**
- API key must be protected on backend
- CORS configuration required

### Option B: Backend for Frontend (BFF)

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│  React Frontend │────────▶│   BFF Layer     │────────▶│   RAG Service   │
│                 │◀────────│   (Same host)   │◀────────│                 │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

**When to use BFF:**
- Multiple frontend clients (web, mobile, IoT)
- Complex aggregation from multiple services
- Need to transform API responses per client

**For a portfolio site: BFF adds unnecessary complexity.**

### Option C: Hybrid with Edge Functions (Future Consideration)

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│  React Frontend │───▶│ Edge Function │───▶│   RAG API       │
│                 │    │ (Caching,     │    │   (VPS)         │
│                 │◀───│  Rate Limit)  │◀───│                 │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

**Benefits:**
- Edge functions handle caching and rate limiting
- RAG API stays protected
- Better global performance

---

## Handling Streaming Responses in React

### Frontend Implementation (Server-Sent Events)

```typescript
// useRAGQuery.ts
import { useState, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

export function useRAGQuery() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askQuestion = useCallback(async (question: string) => {
    setIsLoading(true);
    setError(null);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: question }]);

    // Add placeholder for assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '', isLoading: true }]);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/ask/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            // Update the last message with new content
            setMessages(prev => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg.role === 'assistant') {
                lastMsg.content += data;
              }
              return updated;
            });
          }
        }
      }

      // Mark loading as complete
      setMessages(prev => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg.role === 'assistant') {
          lastMsg.isLoading = false;
        }
        return updated;
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { messages, isLoading, error, askQuestion };
}
```

### Loading State Component

```tsx
// ChatMessage.tsx
interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div className={`message ${message.role}`}>
      {message.content}
      {message.isLoading && (
        <span className="typing-indicator">
          <span></span><span></span><span></span>
        </span>
      )}
    </div>
  );
}
```

---

## Recommended Architecture

### Architecture Diagram

```
                           ┌────────────────────────────────┐
                           │         INTERNET               │
                           └───────────────┬────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
           ┌────────▼────────┐                         ┌──────────▼──────────┐
           │    Vercel CDN   │                         │  DigitalOcean VPS   │
           │                 │                         │  ($6/month)         │
           │  React Frontend │    HTTPS + CORS         │                     │
           │  (Static Build) │◀───────────────────────▶│  ┌───────────────┐  │
           │                 │                         │  │    Nginx      │  │
           └─────────────────┘                         │  │  (SSL Term)   │  │
                                                       │  └───────┬───────┘  │
                                                       │          │          │
                                                       │  ┌───────▼───────┐  │
                                                       │  │   FastAPI     │  │
                                                       │  │   (uvicorn)   │  │
                                                       │  │               │  │
                                                       │  │  - RAG Logic  │  │
                                                       │  │  - Rate Limit │  │
                                                       │  │  - Validation │  │
                                                       │  └───────┬───────┘  │
                                                       │          │          │
                                                       └──────────┼──────────┘
                                                                  │
                                         ┌────────────────────────┴─────────────────────────┐
                                         │                                                  │
                                ┌────────▼────────┐                              ┌──────────▼──────────┐
                                │   OpenAI API    │                              │  ChromaDB (Local)   │
                                │                 │                              │  or Pinecone        │
                                │  - Embeddings   │                              │                     │
                                │  - GPT-4o-mini  │                              │  Vector Storage     │
                                └─────────────────┘                              └─────────────────────┘
```

### Cost Breakdown

| Item | Monthly Cost |
|------|--------------|
| DigitalOcean Droplet (1GB) | $6 |
| Domain name (amortized) | ~$1 |
| OpenAI API (estimated light use) | $1-5 |
| Vercel (free tier for frontend) | $0 |
| **Total** | **$8-12/month** |

### Technology Stack Summary

| Layer | Technology | Reason |
|-------|------------|--------|
| Frontend | React (existing) | Already in use |
| Frontend Hosting | Vercel (free) | Easy deployment, global CDN |
| Backend | FastAPI + Python | Best AI/ML ecosystem |
| Process Manager | systemd | Native Linux integration |
| Reverse Proxy | Nginx | SSL termination, security |
| SSL | Let's Encrypt | Free, auto-renewal |
| Vector Database | ChromaDB (local) | Free, simple for small scale |
| LLM | OpenAI GPT-4o-mini | Cost-effective, high quality |
| Embeddings | text-embedding-3-small | Low cost, good quality |

---

## Implementation Roadmap

### Phase 1: Local Development (Week 1)

1. [ ] Set up Python virtual environment
2. [ ] Create FastAPI application with basic endpoints
3. [ ] Implement RAG logic with LangChain
4. [ ] Set up ChromaDB for local vector storage
5. [ ] Create document ingestion script for portfolio content
6. [ ] Test streaming responses locally
7. [ ] Build React chat component with streaming support

### Phase 2: Production Preparation (Week 2)

1. [ ] Set up DigitalOcean account and create Droplet
2. [ ] Configure Nginx reverse proxy
3. [ ] Set up Let's Encrypt SSL
4. [ ] Configure systemd service
5. [ ] Set up environment variables securely
6. [ ] Implement rate limiting
7. [ ] Add logging and monitoring

### Phase 3: Integration and Testing (Week 3)

1. [ ] Configure CORS for production domains
2. [ ] Deploy backend to VPS
3. [ ] Update React frontend with production API URL
4. [ ] Deploy frontend to Vercel
5. [ ] End-to-end testing
6. [ ] Performance optimization
7. [ ] Security audit

### Phase 4: Polish and Documentation (Week 4)

1. [ ] Error handling improvements
2. [ ] Loading state animations
3. [ ] Mobile responsiveness
4. [ ] Write deployment documentation
5. [ ] Set up automated backups
6. [ ] Monitor and iterate

---

## References and Resources

### Official Documentation
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [LangChain Documentation](https://python.langchain.com/)
- [OpenAI API Reference](https://platform.openai.com/docs/)
- [DigitalOcean Tutorials](https://www.digitalocean.com/community/tutorials)

### Tutorials Referenced
- [Build a RAG System with Node.js & OpenAI](https://www.zignuts.com/blog/build-rag-system-nodejs-openai)
- [Building a RAG System with LangChain and FastAPI](https://www.datacamp.com/tutorial/building-a-rag-system-with-langchain-and-fastapi)
- [Async RAG System with FastAPI, Qdrant & LangChain](https://blog.futuresmart.ai/rag-system-with-async-fastapi-qdrant-langchain-and-openai)
- [How to Set Up a Node.js Application for Production on Ubuntu](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-20-04)
- [Rate Limiting with FastAPI](https://thedkpatel.medium.com/rate-limiting-with-fastapi-an-in-depth-guide-c4d64a776b83)

### Security Resources
- [Secrets Management Best Practices](https://securityboulevard.com/2025/12/are-environment-variables-still-safe-for-secrets-in-2026/)
- [FastAPI Security Guide](https://escape.tech/blog/how-to-secure-fastapi-api/)
- [Express CORS Best Practices](https://expressjs.com/en/resources/middleware/cors.html)

---

*Document generated January 2026. Review and update as technologies and pricing evolve.*
