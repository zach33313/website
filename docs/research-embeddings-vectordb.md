# Embedding Models and Vector Databases Research

## Research for RAG System on Personal Portfolio Website

**Requirements:**
- Store embeddings for resume content, code samples, and personal documents
- Small scale: 100-500 documents maximum
- Cost-effective
- Local development AND VM deployment
- Easy to set up and maintain

---

## Table of Contents
1. [Embedding Models Comparison](#embedding-models-comparison)
2. [Vector Databases Comparison](#vector-databases-comparison)
3. [Recommendations](#recommendations)

---

## Embedding Models Comparison

### Summary Table

| Model | Price (per 1M tokens) | Dimensions | MTEB Score | Local/API | Best For |
|-------|----------------------|------------|------------|-----------|----------|
| OpenAI text-embedding-3-small | $0.02 | 1536 (flexible) | 62.3% | API only | Cost-effective API option |
| OpenAI text-embedding-3-large | $0.13 | 3072 (flexible) | 64.6% | API only | High accuracy needs |
| OpenAI text-embedding-ada-002 | $0.10 | 1536 | 61.0% | API only | Legacy (not recommended) |
| Cohere embed-v4 | $0.10 | 1024 | 65.2% | API only | Best MTEB score |
| Cohere embed-v3 (English) | ~$0.10 | 1024 | 64.5% | API only | English-focused tasks |
| Voyage AI voyage-3-large | $0.12 | 1536/2048 | 63.8% | API only | Domain-specific tuning |
| Voyage AI voyage-3 | ~$0.06 | 1024 | ~62% | API only | Cost-quality balance |
| Jina AI jina-embeddings-v3 | Free tier + paid | 1024 (32-1024) | 65.5% | Both | Multilingual, flexible dims |
| sentence-transformers/all-MiniLM-L6-v2 | FREE | 384 | ~56% | Local only | Fast, lightweight, free |
| sentence-transformers/all-mpnet-base-v2 | FREE | 768 | ~63% | Local only | Best quality local model |

---

### 1. OpenAI Embedding Models

#### text-embedding-3-small
- **Price:** $0.02 per 1M tokens (5x cheaper than ada-002)
- **Dimensions:** 1536 (default), supports reduction to 512 via Matryoshka learning
- **MTEB Score:** 62.3% (English), 44.0% (Multilingual/MIRACL)
- **Context Length:** 8191 tokens
- **Setup:** API-based, requires OpenAI API key
- **Pros:**
  - Very cost-effective for API-based solution
  - Native dimension reduction without significant quality loss
  - Easy integration with many frameworks
  - Reliable, well-documented API
- **Cons:**
  - Requires internet connection
  - API costs (though minimal)
  - Data leaves your infrastructure

#### text-embedding-3-large
- **Price:** $0.13 per 1M tokens
- **Dimensions:** 3072 (default), supports reduction to 256, 512, 1024
- **MTEB Score:** 64.6% (English), 54.9% (Multilingual)
- **Context Length:** 8191 tokens
- **Pros:**
  - Higher quality embeddings
  - Flexible dimension reduction
  - Excellent multilingual support
- **Cons:**
  - Higher cost
  - Larger storage requirements at full dimensions

**Note:** OpenAI's ada-002 (legacy) costs $0.10/1M tokens with only 61% MTEB - NOT recommended for new projects.

**Sources:**
- [OpenAI Embedding Announcement](https://openai.com/index/new-embedding-models-and-api-updates/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)

---

### 2. Cohere Embed Models

#### embed-v4 (Latest)
- **Price:** $0.10 per 1M text tokens, $0.47 per 1M image tokens
- **Dimensions:** 1536
- **MTEB Score:** 65.2% (Highest among compared models as of Nov 2025)
- **Context Length:** 512 tokens
- **Setup:** API-based, requires Cohere API key
- **Features:**
  - Multimodal (text and images)
  - Compression-aware training for efficient storage
  - Evaluates document quality for better ranking

#### embed-v3 (English)
- **Price:** ~$0.10 per 1M tokens
- **Dimensions:** 1024 (full), 384 (light version)
- **MTEB Score:** 64.5%, BEIR: 55.9%
- **Context Length:** 512 tokens
- **Variants:**
  - `embed-english-v3.0`: 1024 dimensions
  - `embed-english-light-v3.0`: 384 dimensions (faster)
  - `embed-multilingual-v3.0`: 100+ languages

**Pros:**
- State-of-the-art MTEB performance
- Good compression for cost-efficiency
- Light versions for speed-sensitive applications

**Cons:**
- API-only (no local option)
- Shorter context length (512 tokens)

**Sources:**
- [Cohere Embed v3 Announcement](https://cohere.com/blog/introducing-embed-v3)
- [Cohere Pricing](https://cohere.com/pricing)

---

### 3. Sentence-Transformers (Local Models)

#### all-MiniLM-L6-v2
- **Price:** FREE (open source)
- **Dimensions:** 384
- **MTEB Score:** ~56% average
- **Parameters:** 22 million
- **Setup:** `pip install sentence-transformers`
- **Inference Speed:** 3-6 seconds per document

```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
embeddings = model.encode(["Your text here"])
```

**Pros:**
- Completely free
- Runs locally (no internet required)
- Very fast inference
- Small model size (~90MB)
- No data privacy concerns
- 5x faster than mpnet

**Cons:**
- Lower quality than API models
- Requires local compute resources

#### all-mpnet-base-v2
- **Price:** FREE (open source)
- **Dimensions:** 768
- **MTEB Score:** ~63% (comparable to API models)
- **Parameters:** 110 million
- **Setup:** Same as MiniLM
- **Inference Speed:** 30-50 seconds per document (5-10x slower than MiniLM)

**Pros:**
- Best quality among free local models
- Approaches API model performance
- Completely free
- No data privacy concerns

**Cons:**
- Larger model (~400MB)
- Slower inference
- Requires more compute resources

**Recommendation:** For 100-500 documents, `all-MiniLM-L6-v2` is excellent for prototyping. Use `all-mpnet-base-v2` if quality is more important than speed.

**Sources:**
- [all-MiniLM-L6-v2 on Hugging Face](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [SBERT Pretrained Models](https://www.sbert.net/docs/sentence_transformer/pretrained_models.html)

---

### 4. Voyage AI Embeddings

#### voyage-3-large (Latest - January 2025)
- **Price:** $0.12 per 1M tokens
- **Dimensions:** 1536 (default), supports 256, 512, 1024, 2048
- **MTEB Score:** 63.8%
- **Context Length:** 32,000 tokens
- **Free Tier:** 200M tokens free for new accounts

**Pros:**
- Very long context length (32K tokens)
- Matryoshka learning for dimension flexibility
- Domain-specific models available (code, law, finance)
- Generous free tier
- Outperforms OpenAI v3-large by 7.55% on average

**Cons:**
- API-only
- Smaller ecosystem than OpenAI

#### voyage-3-lite
- **Price:** Lower than voyage-3-large
- **Dimensions:** 512
- **Performance:** 66.1% accuracy in some benchmarks
- **Best for:** Budget-sensitive implementations

**Sources:**
- [Voyage AI voyage-3-large Announcement](https://blog.voyageai.com/2025/01/07/voyage-3-large/)
- [Voyage AI Pricing](https://docs.voyageai.com/docs/pricing)

---

### 5. Jina AI Embeddings

#### jina-embeddings-v3
- **Price:** Token-based, generous free tier (10M tokens for new users)
- **Dimensions:** 1024 (default), flexible 32-1024 via Matryoshka
- **MTEB Score:** 65.52% average
- **Context Length:** 8192 tokens
- **Parameters:** 570 million
- **Languages:** 89 languages supported

**Key Features:**
- Task-specific LoRA adapters for retrieval, classification, clustering
- Available on Hugging Face for local deployment
- AWS Marketplace available

**Rate Limits:**
- Free: 100 RPM, 100K TPM
- Paid: 500 RPM, 2M TPM
- Premium: 5,000 RPM, 50M TPM

**Pros:**
- Excellent multilingual support
- Task-specific optimizations
- Flexible dimensions
- Can run locally via Hugging Face

**Cons:**
- Large model (570M parameters)
- More complex setup for local deployment

**Sources:**
- [Jina Embeddings v3 Announcement](https://jina.ai/news/jina-embeddings-v3-a-frontier-multilingual-embedding-model/)
- [Jina Embeddings API](https://jina.ai/embeddings/)

---

## Vector Databases Comparison

### Summary Table

| Database | Hosting Options | Free Tier | Setup Complexity | Best For |
|----------|----------------|-----------|------------------|----------|
| ChromaDB | Local, Self-hosted, Cloud | Yes (OSS) | Very Easy | Prototyping, small projects |
| FAISS | Local only | Yes (OSS) | Medium | Pure vector search, research |
| LanceDB | Local, Cloud | Yes (OSS) | Very Easy | Edge/embedded, multimodal |
| Qdrant | Local, Self-hosted, Cloud | Yes (1GB free) | Easy | Production-ready, scalable |
| Pinecone | Cloud only | Yes (limited) | Easy | Managed, enterprise |
| pgvector | Local, Self-hosted | Yes (OSS) | Medium | Existing PostgreSQL users |
| Weaviate | Local, Self-hosted, Cloud | Yes (OSS) | Medium | Hybrid search, enterprise |

---

### 1. ChromaDB

**Hosting Options:**
- Local (in-process, SQLite/DuckDB backend)
- Self-hosted server mode
- Chroma Cloud (managed, serverless)

**Pricing:**
- Open Source: FREE (Apache 2.0)
- Self-hosted on Railway: ~$5-10/month
- Chroma Cloud: $5 free credits to start

**Setup:**
```bash
pip install chromadb
```

```python
import chromadb
client = chromadb.Client()  # In-memory
# OR
client = chromadb.PersistentClient(path="/path/to/db")  # Persistent
```

**Features:**
- Built-in embedding functions (Sentence Transformers, OpenAI, Cohere)
- Metadata filtering
- Full-text search
- Automatic persistence
- Python, JavaScript/TypeScript, Ruby, PHP, Java SDKs

**Performance:**
- 2025 Rust rewrite: 4x faster writes and queries
- Ideal for prototypes under 10M vectors
- Uses FAISS under the hood for similarity search

**Pros:**
- Extremely easy to get started
- NumPy-like Python API
- Built-in embedding support
- Excellent for RAG prototyping
- Active community

**Cons:**
- Not as performant as specialized DBs at scale
- Limited horizontal scaling

**Sources:**
- [ChromaDB GitHub](https://github.com/chroma-core/chroma)
- [Chroma Website](https://www.trychroma.com/)

---

### 2. FAISS (Facebook AI Similarity Search)

**Hosting Options:**
- Local only (in-memory or memory-mapped files)
- No managed service

**Pricing:**
- FREE (MIT License)

**Setup:**
```bash
pip install faiss-cpu  # or faiss-gpu
```

```python
import faiss
import numpy as np

dimension = 384
index = faiss.IndexFlatL2(dimension)
vectors = np.random.random((100, dimension)).astype('float32')
index.add(vectors)
D, I = index.search(query_vector, k=5)
```

**Features:**
- Multiple index types (Flat, IVF, HNSW, PQ)
- GPU acceleration
- Billion-scale vector support
- SIMD optimizations

**Performance:**
- State-of-the-art speed (sub-millisecond queries)
- 8.5x faster than previous SOTA for billion-scale
- Memory-mapped files for larger-than-RAM datasets

**Pros:**
- Fastest vector search library
- GPU support
- Excellent for research and custom implementations
- Integrates with LangChain, Haystack

**Cons:**
- No persistence built-in (must save/load manually)
- No metadata storage or filtering
- No built-in API server
- Requires more engineering for production

**Sources:**
- [FAISS GitHub](https://github.com/facebookresearch/faiss)
- [FAISS Documentation](https://faiss.ai/index.html)

---

### 3. LanceDB

**Hosting Options:**
- Local/Embedded (in-process, disk-based)
- LanceDB Cloud (serverless, managed)

**Pricing:**
- Open Source: FREE (Apache 2.0)
- Cloud: Compute-storage separation, up to 100x savings

**Setup:**
```bash
pip install lancedb
```

```python
import lancedb

db = lancedb.connect("./my_db")
table = db.create_table("my_table", data=[
    {"vector": [1.1, 1.2, ...], "text": "hello"}
])
results = table.search([1.0, 1.1, ...]).limit(10).to_list()
```

**Features:**
- Native Python, Rust, TypeScript/Node.js SDKs
- Apache Arrow columnar format
- Zero-copy, memory-mapped access
- Automatic versioning and time-travel
- Multimodal support (text, images, video, audio)
- GPU-accelerated index building
- Nested documents and array fields

**Performance:**
- Disk-based with near in-memory speed
- ~95% accuracy with millisecond latency
- Handles datasets larger than RAM via SSD

**Pros:**
- Truly serverless/embedded (like SQLite for vectors)
- No server to manage
- Excellent for edge computing
- TypeScript SDK (rare among embedded options)
- Used by Midjourney, Runway at massive scale

**Cons:**
- Newer, smaller community
- Schema required for tables

**Sources:**
- [LanceDB GitHub](https://github.com/lancedb/lancedb)
- [LanceDB Website](https://lancedb.com/)

---

### 4. Qdrant

**Hosting Options:**
- Local (Docker or binary)
- Self-hosted (Kubernetes, any cloud)
- Qdrant Cloud (managed)
- Hybrid Cloud (your infra, managed by Qdrant)

**Pricing:**
- Open Source: FREE (Apache 2.0)
- Cloud Free Tier: 1GB cluster
- Cloud Paid: Starting ~$0.014/hour
- AWS/GCP/Azure Marketplace available

**Setup:**
```bash
docker pull qdrant/qdrant
docker run -p 6333:6333 qdrant/qdrant
```

```python
from qdrant_client import QdrantClient

client = QdrantClient("localhost", port=6333)
# OR for embedded mode:
client = QdrantClient(":memory:")
```

**Features:**
- REST and gRPC APIs
- Python, Rust, Go, TypeScript SDKs
- Payload filtering with rich query language
- Binary, Scalar, and Product Quantization (40x memory reduction)
- Multi-tenancy support
- Automatic failover and replication

**Performance:**
- Highly optimized for production workloads
- Efficient quantization for large-scale deployments
- Excellent query latency

**Pros:**
- Production-ready out of the box
- Excellent documentation
- Strong filtering capabilities
- Memory-efficient quantization
- SOC 2 Type II certified (cloud)

**Cons:**
- More complex than Chroma for simple use cases
- Requires Docker for local server mode

**Sources:**
- [Qdrant Website](https://qdrant.tech/)
- [Qdrant Pricing](https://qdrant.tech/pricing/)

---

### 5. Pinecone

**Hosting Options:**
- Cloud only (AWS, GCP, Azure)
- Serverless architecture

**Pricing:**
- **Starter (Free):** 5 indexes, 2GB storage, 2M write units/month, 1M read units/month
- **Standard:** $50/month minimum, $16/million read units
- **Enterprise:** $500/month minimum, $24/million read units

**Setup:**
```python
from pinecone import Pinecone

pc = Pinecone(api_key="your-api-key")
index = pc.Index("my-index")
```

**Features:**
- Fully managed, serverless
- Automatic scaling
- Metadata filtering
- Sparse-dense hybrid search
- Pinecone Inference (built-in embeddings)
- Role-Based Access Control (RBAC)
- Prometheus/Datadog monitoring

**Performance:**
- 10x-100x cost reduction with serverless architecture
- Dedicated read nodes for predictable performance
- No noisy neighbor issues on dedicated plans

**Pros:**
- Zero infrastructure management
- Excellent for production at scale
- Strong enterprise features
- Great documentation and support

**Cons:**
- Cloud-only (no local development)
- Can be expensive at scale
- Vendor lock-in
- Free tier limited to one region

**Sources:**
- [Pinecone Pricing](https://www.pinecone.io/pricing/)
- [Pinecone Serverless Announcement](https://techcrunch.com/2024/01/16/pinecones-vector-database-gets-a-new-serverless-architecture/)

---

### 6. pgvector (PostgreSQL Extension)

**Hosting Options:**
- Local (PostgreSQL + extension)
- Self-hosted
- Managed PostgreSQL services (Neon, Supabase, AWS RDS, Azure, etc.)

**Pricing:**
- Open Source: FREE
- Managed: Depends on PostgreSQL provider

**Setup:**
```sql
CREATE EXTENSION vector;
CREATE TABLE items (id serial PRIMARY KEY, embedding vector(384));
CREATE INDEX ON items USING hnsw (embedding vector_l2_ops);
```

```python
import psycopg2
conn = psycopg2.connect("postgresql://...")
cur = conn.cursor()
cur.execute("SELECT * FROM items ORDER BY embedding <-> %s LIMIT 5", (query_vector,))
```

**Features:**
- Full PostgreSQL features (ACID, JOINs, transactions)
- IVFFlat and HNSW index types
- L2, inner product, cosine distance
- Exact and approximate nearest neighbor search
- Point-in-time recovery

**Performance (v0.8.0 - Nov 2024):**
- Iterative index scans for better filtering
- Improved HNSW search and build performance
- Scales vertically; can use Citus for sharding

**Pros:**
- Use existing PostgreSQL infrastructure
- Full SQL query capabilities
- ACID compliance
- Rich ecosystem of tools
- Combine with relational data

**Cons:**
- Not as fast as specialized vector DBs
- Requires PostgreSQL knowledge
- Less optimized for pure vector workloads

**Sources:**
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [pgvector 0.8.0 Release](https://www.postgresql.org/about/news/pgvector-080-released-2952/)

---

### 7. Weaviate

**Hosting Options:**
- Local (Docker)
- Self-hosted (Kubernetes)
- Weaviate Serverless Cloud
- Enterprise Cloud (dedicated)
- BYOC (Bring Your Own Cloud)

**Pricing:**
- Open Source: FREE (BSD-3)
- Serverless Standard: Starting ~$25/month (~$0.095 per 1M vector dimensions)
- Professional: ~$135/month
- Business Critical: ~$450/month
- 14-day free trial available

**Setup:**
```bash
docker run -p 8080:8080 semitechnologies/weaviate
```

```python
import weaviate

client = weaviate.connect_to_local()
# OR
client = weaviate.connect_to_wcs(cluster_url="...", auth_credentials=...)
```

**Features:**
- GraphQL API
- Hybrid search (dense + sparse BM25)
- Built-in vectorizers (OpenAI, Cohere, HuggingFace)
- Multi-tenancy
- Modular architecture
- Automatic schema inference

**Performance:**
- HNSW and Flat indexes
- Dynamic indexing
- Compression options

**Pros:**
- Powerful hybrid search
- Rich query language (GraphQL)
- Built-in ML model integrations
- Good enterprise features
- Active community

**Cons:**
- More complex than simpler options
- Higher resource requirements
- Steeper learning curve

**Sources:**
- [Weaviate Pricing](https://weaviate.io/pricing)
- [Weaviate Pricing Update Blog](https://weaviate.io/blog/weaviate-cloud-pricing-update)

---

## Recommendations

### For Your Use Case: Small-Scale Portfolio RAG (100-500 documents)

#### Best Embedding Model: **sentence-transformers/all-MiniLM-L6-v2**

**Reasons:**
1. **Free** - No API costs, perfect for cost-conscious deployment
2. **Local** - Works offline, no data privacy concerns
3. **Fast** - 3-6 seconds per document embedding
4. **Small** - 384 dimensions means smaller storage requirements
5. **Easy** - One pip install, simple Python API
6. **Sufficient Quality** - ~56% MTEB is adequate for 100-500 documents

**Alternative:** If you need higher quality and don't mind API costs:
- **OpenAI text-embedding-3-small** ($0.02/1M tokens) - For 500 documents, cost would be negligible (~$0.01-0.05)
- **Jina AI** - Free tier of 10M tokens is more than enough

#### Best Vector Database: **ChromaDB** or **LanceDB**

##### Primary Recommendation: ChromaDB

**Reasons:**
1. **Simplest setup** - `pip install chromadb` and you're done
2. **Built for RAG** - Designed specifically for this use case
3. **Built-in embeddings** - Integrates directly with sentence-transformers
4. **Persistent** - Saves to disk automatically
5. **Great for prototyping** - NumPy-like API
6. **Free** - Open source, no costs
7. **Scales to 10M vectors** - Far more than you need

##### Alternative: LanceDB

**Choose LanceDB if:**
- You need TypeScript/Node.js support
- You want versioning/time-travel features
- You're building edge/embedded applications
- You need multimodal support (images, audio)

### Complete Stack Recommendation

```
+------------------+     +------------------+     +------------------+
|   Your Docs      | --> |  all-MiniLM-L6-v2 | --> |    ChromaDB      |
|  (100-500 docs)  |     |   (Embedding)    |     |  (Vector Store)  |
+------------------+     +------------------+     +------------------+
                                                          |
                                                          v
                                                  +------------------+
                                                  |   RAG Query      |
                                                  |   (Retrieval)    |
                                                  +------------------+
```

### Sample Implementation

```python
# Installation
# pip install chromadb sentence-transformers

import chromadb
from sentence_transformers import SentenceTransformer

# Initialize embedding model
embedder = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

# Initialize ChromaDB with persistence
client = chromadb.PersistentClient(path="./chroma_db")

# Create collection with custom embedding function
collection = client.get_or_create_collection(
    name="portfolio_docs",
    metadata={"hnsw:space": "cosine"}
)

# Add documents
documents = ["Your resume content...", "Code sample description...", "Project details..."]
embeddings = embedder.encode(documents).tolist()

collection.add(
    documents=documents,
    embeddings=embeddings,
    ids=[f"doc_{i}" for i in range(len(documents))],
    metadatas=[{"type": "resume"}, {"type": "code"}, {"type": "project"}]
)

# Query
query = "What programming languages do you know?"
query_embedding = embedder.encode([query]).tolist()

results = collection.query(
    query_embeddings=query_embedding,
    n_results=5
)
```

### Cost Estimate

| Component | Local Development | VM Deployment |
|-----------|------------------|---------------|
| Embedding Model | Free | Free |
| Vector Database | Free | Free |
| Compute (initial embedding) | Your machine | ~5 min VM time |
| Storage | <100MB for 500 docs | <100MB |
| **Total Monthly Cost** | **$0** | **$0** (if on existing VM) |

### Deployment Notes

1. **Local Development:** Both sentence-transformers and ChromaDB run perfectly on a laptop with 8GB RAM
2. **VM Deployment:**
   - ChromaDB persists to disk, so just copy the `./chroma_db` folder
   - Model can be cached after first download (~90MB)
   - No external dependencies or databases needed

3. **Scaling Path:** If you later need:
   - Better quality: Switch to OpenAI embeddings (change one line)
   - More scale: Migrate to Qdrant Cloud (similar API)
   - Enterprise features: Move to Weaviate or Pinecone

---

## Appendix: Quick Reference

### Embedding Model Decision Tree

```
Do you need the absolute best quality?
├── Yes → Cohere embed-v4 or OpenAI text-embedding-3-large
└── No
    └── Is cost a primary concern?
        ├── Yes → sentence-transformers/all-MiniLM-L6-v2 (FREE)
        └── No
            └── Need multilingual?
                ├── Yes → Jina embeddings-v3
                └── No → OpenAI text-embedding-3-small
```

### Vector Database Decision Tree

```
Do you need cloud-only managed service?
├── Yes → Pinecone or Weaviate Cloud
└── No
    └── Do you need to run on edge/embedded?
        ├── Yes → LanceDB
        └── No
            └── Do you have existing PostgreSQL?
                ├── Yes → pgvector
                └── No
                    └── Is simplicity most important?
                        ├── Yes → ChromaDB
                        └── No → Qdrant
```

---

*Research compiled: January 2026*
*Last updated: January 18, 2026*
