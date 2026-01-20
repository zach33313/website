# RAG-Powered Q&A Feature: Comprehensive Cost Analysis

**Last Updated:** January 2026
**Scope:** Portfolio website with ~100-500 documents, ~100-1000 queries/month

---

## Table of Contents
1. [One-Time Costs (Vectorization)](#1-one-time-costs-vectorization)
2. [Recurring Costs (Per Query)](#2-recurring-costs-per-query)
3. [Infrastructure Costs](#3-infrastructure-costs)
4. [Monthly Projections](#4-monthly-projections)
5. [Recommendations](#5-recommendations)
6. [Sources](#sources)

---

## 1. One-Time Costs (Vectorization)

### Assumptions
- **Documents:** 500 documents
- **Tokens per document:** Average 1,250 tokens (range: 500-2,000)
- **Total tokens to embed:** 500 docs x 1,250 tokens = **625,000 tokens**

### Embedding Model Pricing Comparison

| Model | Price per 1M Tokens | Total Cost (625K tokens) | Quality | Dimensions |
|-------|---------------------|--------------------------|---------|------------|
| **OpenAI text-embedding-ada-002** (Legacy) | $0.10 | $0.0625 | Good | 1,536 |
| **OpenAI text-embedding-3-small** | $0.02 | $0.0125 | Better | 1,536 |
| **OpenAI text-embedding-3-large** | $0.13 | $0.0813 | Best | 3,072 |
| **Cohere embed-v4** | $0.12 | $0.075 | Excellent | 1,536 |
| **Cohere embed-english-v3.0** | ~$0.10* | ~$0.0625 | Very Good | 1,024 |
| **sentence-transformers (local)** | FREE | $0.00 | Good | 384 |

*Note: Cohere v3 pricing estimated; v4 is the current model at $0.12/M tokens*

### Calculation Formula
```
Cost = (Total Tokens / 1,000,000) x Price per Million Tokens
Cost = (625,000 / 1,000,000) x $0.02 = $0.0125 (for text-embedding-3-small)
```

### Local/Free Options

| Model | Cost | RAM Required | Quality | Setup Complexity |
|-------|------|--------------|---------|------------------|
| **all-MiniLM-L6-v2** | FREE | ~100MB | Good | Easy |
| **all-mpnet-base-v2** | FREE | ~420MB | Better | Easy |
| **BAAI/bge-small-en** | FREE | ~130MB | Good | Medium |

**Key Insight:** Even the most expensive option (text-embedding-3-large) costs less than $0.10 for initial vectorization. This is essentially negligible.

---

## 2. Recurring Costs (Per Query)

Each query involves:
1. **Embedding the user's question** (~50 tokens average)
2. **LLM response generation** (~500 input tokens context + ~200 output tokens)

### 2.1 Query Embedding Costs

| Model | Price per 1M Tokens | Cost per Query (50 tokens) | Cost per 1,000 Queries |
|-------|---------------------|----------------------------|------------------------|
| **OpenAI text-embedding-3-small** | $0.02 | $0.000001 | $0.001 |
| **OpenAI text-embedding-ada-002** | $0.10 | $0.000005 | $0.005 |
| **Cohere embed-v4** | $0.12 | $0.000006 | $0.006 |
| **Local (sentence-transformers)** | FREE | $0.00 | $0.00 |

**Key Insight:** Query embedding costs are essentially negligible (<$0.01/month even at 1,000 queries).

### 2.2 LLM Response Generation Costs

**Assumptions per query:**
- Input tokens: 500 (context from RAG)
- Output tokens: 200 (response)

| Model | Input $/M | Output $/M | Cost per Query | Cost per 100 Queries | Cost per 1,000 Queries |
|-------|-----------|------------|----------------|----------------------|------------------------|
| **Groq Llama 3.1 8B** | $0.05 | $0.08 | $0.000041 | $0.0041 | $0.041 |
| **Gemini 1.5 Flash** | $0.075 | $0.30 | $0.000098 | $0.0098 | $0.098 |
| **Gemini 2.5 Flash-Lite** | $0.10 | $0.40 | $0.00013 | $0.013 | $0.13 |
| **GPT-4o-mini** | $0.15 | $0.60 | $0.000195 | $0.0195 | $0.195 |
| **Gemini 2.5 Flash** | $0.15 | $0.60 | $0.000195 | $0.0195 | $0.195 |
| **Gemini 3 Flash** | $0.50 | $3.00 | $0.00085 | $0.085 | $0.85 |
| **Claude Haiku 3** | $0.25 | $1.25 | $0.000375 | $0.0375 | $0.375 |
| **Claude Haiku 3.5** | $0.80 | $4.00 | $0.0012 | $0.12 | $1.20 |
| **Claude Haiku 4.5** | $1.00 | $5.00 | $0.0015 | $0.15 | $1.50 |
| **GPT-4o** | $2.50 | $10.00 | $0.00325 | $0.325 | $3.25 |
| **Claude 3.5/3.7 Sonnet** | $3.00 | $15.00 | $0.0045 | $0.45 | $4.50 |
| **Claude Sonnet 4/4.5** | $3.00 | $15.00 | $0.0045 | $0.45 | $4.50 |

### Calculation Formula
```
Cost per Query = (Input Tokens / 1,000,000) x Input Price + (Output Tokens / 1,000,000) x Output Price
Example (GPT-4o-mini): (500 / 1,000,000) x $0.15 + (200 / 1,000,000) x $0.60 = $0.000075 + $0.00012 = $0.000195
```

### Local LLM Options (Free but requires compute)

| Model | VRAM Required | Quality | Speed |
|-------|---------------|---------|-------|
| **Llama 3.2 1B** | 2-4 GB | Basic | Fast |
| **Llama 3.2 3B** | 4-6 GB | Good | Moderate |
| **Phi-3 Mini** | 4-6 GB | Good | Fast |
| **Mistral 7B** | 8-12 GB | Very Good | Moderate |
| **Llama 3.1 8B** | 10-16 GB | Very Good | Moderate |

---

## 3. Infrastructure Costs

### 3.1 Vector Database Options

| Option | Monthly Cost | Vector Limit | Best For |
|--------|--------------|--------------|----------|
| **Pinecone Free Tier** | $0 | 2GB storage (~100K vectors @ 1536d) | Small projects |
| **Chroma (self-hosted)** | $0 (+ compute) | Unlimited | Development, small-medium |
| **Qdrant (self-hosted)** | $0 (+ compute) | Unlimited | Production |
| **FAISS (in-memory)** | $0 (+ compute) | RAM-limited | Simple use cases |
| **Pinecone Standard** | $50+/month | Pay per usage | Production scale |

**For 500 documents:** Pinecone free tier is more than sufficient (you'd use <1% of capacity).

### 3.2 Backend Hosting Options

| Provider | Plan | Monthly Cost | Includes | Limits |
|----------|------|--------------|----------|--------|
| **Vercel** | Hobby (Free) | $0 | 150K function invocations | 100GB bandwidth |
| **Netlify** | Starter (Free) | $0 | 125K function invocations | 100GB bandwidth |
| **Cloudflare Workers** | Free | $0 | 100K requests/day | 10ms CPU time |
| **DigitalOcean** | Basic Droplet | $4/month | 512MB RAM, 1 vCPU | Always on |
| **DigitalOcean** | Basic Droplet | $6/month | 1GB RAM, 1 vCPU | Always on |
| **Linode** | Shared CPU | $5/month | 1GB RAM, 1 vCPU | Always on |
| **AWS EC2** | t3.micro | $7.59/month* | 1GB RAM, 2 vCPU | + data transfer |
| **AWS EC2** | t3.micro (Free Tier) | $0 (12 months) | 1GB RAM, 2 vCPU | 750 hrs/month |

*AWS: Additional $3.65/month for Elastic IP ($0.005/hr x 730 hrs)

### 3.3 Cost Summary by Hosting Strategy

| Strategy | Vector DB | Backend | Monthly Cost |
|----------|-----------|---------|--------------|
| **Full Free Tier** | Pinecone Free | Vercel/Netlify Free | $0 |
| **Budget VPS** | Chroma (self-hosted) | DigitalOcean $4 | $4 |
| **Standard VPS** | Chroma (self-hosted) | DigitalOcean $6 / Linode $5 | $5-6 |
| **AWS Free Tier** | Pinecone Free | EC2 t3.micro | $0 (first 12 months) |

---

## 4. Monthly Projections

### Scenario Definitions

| Scenario | Queries/Month | Typical Use Case |
|----------|---------------|------------------|
| **Low** | 100 | Personal portfolio, limited traffic |
| **Medium** | 500 | Active portfolio, moderate interest |
| **High** | 1,000 | High-traffic portfolio, viral content |

### 4.1 Budget Option (Cheapest that works well)

**Stack:**
- Embedding: Local sentence-transformers (FREE)
- LLM: Groq Llama 3.1 8B ($0.05/$0.08 per M tokens)
- Vector DB: Pinecone Free or Chroma self-hosted
- Hosting: Vercel/Netlify Free

| Usage | Embedding | LLM Cost | Infrastructure | **Total/Month** |
|-------|-----------|----------|----------------|-----------------|
| Low (100) | $0 | $0.004 | $0 | **$0.004** |
| Medium (500) | $0 | $0.02 | $0 | **$0.02** |
| High (1,000) | $0 | $0.04 | $0 | **$0.04** |

**Effective cost: Essentially FREE** (under $0.05/month)

### 4.2 Balanced Option (Good quality, reasonable cost)

**Stack:**
- Embedding: OpenAI text-embedding-3-small ($0.02/M)
- LLM: GPT-4o-mini ($0.15/$0.60 per M tokens)
- Vector DB: Pinecone Free
- Hosting: Vercel Free

| Usage | Embedding | LLM Cost | Infrastructure | **Total/Month** |
|-------|-----------|----------|----------------|-----------------|
| Low (100) | $0.0001 | $0.02 | $0 | **$0.02** |
| Medium (500) | $0.0005 | $0.10 | $0 | **$0.10** |
| High (1,000) | $0.001 | $0.20 | $0 | **$0.20** |

**Effective cost: Under $0.25/month** at highest usage

### 4.3 Premium Option (Best quality)

**Stack:**
- Embedding: OpenAI text-embedding-3-small ($0.02/M)
- LLM: Claude 3.5/3.7 Sonnet ($3/$15 per M tokens)
- Vector DB: Pinecone Free
- Hosting: Vercel Free (or $4-6 VPS for reliability)

| Usage | Embedding | LLM Cost | Infrastructure | **Total/Month** |
|-------|-----------|----------|----------------|-----------------|
| Low (100) | $0.0001 | $0.45 | $0-6 | **$0.45 - $6.45** |
| Medium (500) | $0.0005 | $2.25 | $0-6 | **$2.25 - $8.25** |
| High (1,000) | $0.001 | $4.50 | $0-6 | **$4.50 - $10.50** |

### 4.4 Complete Cost Matrix

| Option | 100 queries | 500 queries | 1,000 queries |
|--------|-------------|-------------|---------------|
| **Budget** (Groq + Free hosting) | $0.004 | $0.02 | $0.04 |
| **Balanced** (GPT-4o-mini + Free hosting) | $0.02 | $0.10 | $0.20 |
| **Quality** (Gemini 3 Flash + Free hosting) | $0.09 | $0.43 | $0.85 |
| **Premium** (Claude Sonnet + Free hosting) | $0.45 | $2.25 | $4.50 |
| **Premium + VPS** (Claude Sonnet + $5 VPS) | $5.45 | $7.25 | $9.50 |

---

## 5. Recommendations

### Best Value Embedding Model

**Winner: OpenAI text-embedding-3-small**
- Cost: $0.02 per million tokens
- Quality: Excellent (13% better than ada-002)
- Reason: 5x cheaper than ada-002, better quality, widely supported

**Budget Alternative: sentence-transformers/all-MiniLM-L6-v2**
- Cost: FREE
- Quality: Good for most use cases
- Trade-off: Requires local compute, 384 dimensions (smaller than OpenAI's 1,536)

### Best Value LLM

**Winner: GPT-4o-mini**
- Cost: $0.15/$0.60 per M tokens
- Quality: Excellent for Q&A tasks
- Reason: Best quality-to-cost ratio, reliable, fast

**Budget Alternative: Groq Llama 3.1 8B**
- Cost: $0.05/$0.08 per M tokens
- Quality: Good for straightforward Q&A
- Trade-off: Slightly lower quality, but essentially free at this scale

**Quality Alternative: Gemini 3 Flash**
- Cost: $0.50/$3.00 per M tokens
- Quality: Excellent, outperforms GPT-4o in many benchmarks
- Reason: 10x cheaper than GPT-4o input, near-flagship quality

### Best Value Infrastructure Setup

**Winner: Full Serverless (Free Tier)**
- Vector DB: Pinecone Free Tier (2GB, more than enough for 500 docs)
- Hosting: Vercel or Netlify Free Tier
- Monthly Cost: $0

**Alternative: Budget VPS**
- Vector DB: Chroma self-hosted
- Hosting: DigitalOcean $4-6/month
- Benefit: More control, can run local embeddings

### Recommended Setup (Best Overall Value)

| Component | Choice | Monthly Cost |
|-----------|--------|--------------|
| **Embedding** | OpenAI text-embedding-3-small | ~$0.001 |
| **LLM** | GPT-4o-mini | ~$0.10-0.20 |
| **Vector DB** | Pinecone Free Tier | $0 |
| **Hosting** | Vercel Free Tier | $0 |
| **TOTAL** | | **~$0.10-0.20/month** |

### Alternative Budget Setup (Essentially Free)

| Component | Choice | Monthly Cost |
|-----------|--------|--------------|
| **Embedding** | sentence-transformers (local) | $0 |
| **LLM** | Groq Llama 3.1 8B | ~$0.02-0.04 |
| **Vector DB** | Pinecone Free or Chroma | $0 |
| **Hosting** | Vercel/Netlify Free | $0 |
| **TOTAL** | | **~$0.02-0.04/month** |

### Alternative Quality Setup

| Component | Choice | Monthly Cost |
|-----------|--------|--------------|
| **Embedding** | OpenAI text-embedding-3-small | ~$0.001 |
| **LLM** | Claude 3.5/3.7 Sonnet | ~$2.25-4.50 |
| **Vector DB** | Pinecone Free Tier | $0 |
| **Hosting** | Vercel Free Tier | $0 |
| **TOTAL** | | **~$2.50-5.00/month** |

---

## Cost Optimization Tips

1. **Use Batch API** - OpenAI and Anthropic offer 50% discount for non-real-time requests
2. **Prompt Caching** - Anthropic offers 90% discount on cached prompt reads
3. **Context Caching** - Google offers 90% discount on cached context reads
4. **Smaller Context** - Reduce retrieved chunks from 5 to 3 to cut LLM costs by ~40%
5. **Response Length Limits** - Set max_tokens to control output costs
6. **Rate Limiting** - Implement per-user limits to prevent abuse

---

## Summary

For a portfolio website RAG system with 500 documents and 100-1,000 queries/month:

| Scenario | Estimated Monthly Cost |
|----------|----------------------|
| **Absolute Minimum** | $0.02 - $0.04 |
| **Recommended** | $0.10 - $0.20 |
| **Premium Quality** | $2.50 - $5.00 |
| **Premium + Dedicated Hosting** | $7.00 - $10.00 |

**Bottom Line:** You can run a fully functional RAG Q&A system for your portfolio for less than $1/month with good quality, or essentially free with slightly lower quality models.

---

## Sources

### Embedding Pricing
- [OpenAI Embeddings Pricing](https://platform.openai.com/docs/pricing)
- [OpenAI Embeddings API Pricing Calculator](https://costgoat.com/pricing/openai-embeddings)
- [Cohere Pricing](https://cohere.com/pricing)
- [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)

### LLM Pricing
- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [Anthropic Claude Pricing](https://www.anthropic.com/pricing)
- [Claude API Pricing Calculator](https://costgoat.com/pricing/claude-api)
- [Google Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Groq Pricing](https://groq.com/pricing)
- [Together AI Pricing](https://www.together.ai/pricing)
- [LLM API Pricing Comparison 2025](https://intuitionlabs.ai/articles/llm-api-pricing-comparison-2025)

### Infrastructure Pricing
- [Pinecone Pricing](https://www.pinecone.io/pricing/)
- [Pinecone Free Plan Updates](https://www.pinecone.io/blog/updated-free-plan/)
- [Vercel Limits](https://vercel.com/docs/limits)
- [Netlify Pricing](https://www.netlify.com/pricing/)
- [DigitalOcean Droplet Pricing](https://www.digitalocean.com/pricing/droplets)
- [Linode Pricing](https://www.linode.com/pricing/)
- [AWS EC2 Pricing](https://aws.amazon.com/ec2/pricing/on-demand/)

### Vector Database Comparisons
- [Pinecone vs Chroma 2025 Comparison](https://aloa.co/ai/comparisons/vector-database-comparison/pinecone-vs-chroma)
- [ChromaDB vs Pinecone Trade-offs](https://www.sourceboxai.com/blog/chromadb-vs-pinecone-the-real-trade-offs-between-self-hosted-and-managed-vector-databases)
- [Best Vector Databases 2025](https://www.firecrawl.dev/blog/best-vector-databases-2025)

---

*Document generated January 2026. Prices are subject to change; verify current pricing before implementation.*
