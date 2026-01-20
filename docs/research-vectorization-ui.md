# Vectorization Insight Tool - Research Document

A comprehensive research document for building a standalone web application that visualizes and controls the document vectorization process for RAG (Retrieval-Augmented Generation) systems.

**Purpose**: Generic, reusable, educational, and functional tool for understanding and performing real vectorization tasks.

---

## Table of Contents

1. [Chunking Visualization & Controls](#1-chunking-visualization--controls)
2. [Embedding Model Settings](#2-embedding-model-settings)
3. [Vector Visualization](#3-vector-visualization)
4. [Processing Pipeline UI](#4-processing-pipeline-ui)
5. [Quality & Analysis Features](#5-quality--analysis-features)
6. [Export & Integration](#6-export--integration)
7. [Existing Tools & Inspiration](#7-existing-tools--inspiration)
8. [React Implementation Recommendations](#8-react-implementation-recommendations)

---

## 1. Chunking Visualization & Controls

### Overview

Chunking is arguably the most critical factor for RAG performance. How documents are split directly affects retrieval quality and answer accuracy. Even a perfect retrieval system fails if it searches over poorly prepared data.

### Chunking Strategies to Support

#### 1.1 Fixed-Size Chunking
- **Character-based**: Split at fixed character counts
- **Token-based**: Split at fixed token counts (more accurate for LLM context)
- Best for: Simple documents, consistent formatting

#### 1.2 RecursiveCharacterTextSplitter (Recommended Default)
The most popular strategy, delivering 85-90% recall in benchmarks.

```javascript
// Configuration parameters
const recursiveConfig = {
  chunkSize: 512,        // tokens or characters
  chunkOverlap: 50,      // overlap between chunks
  separators: [
    '\n\n',              // Paragraph breaks (highest priority)
    '\n',                // Line breaks
    '. ',                // Sentence endings
    ' ',                 // Words
    ''                   // Characters (fallback)
  ],
  lengthFunction: 'tokens' | 'characters'
};
```

**How it works**: Recursively splits text using separator hierarchy - paragraph -> sentence -> word. Prioritizes keeping semantically related units together.

#### 1.3 Semantic Chunking
Groups text by semantic similarity rather than character/token count.

```javascript
const semanticConfig = {
  embeddingModel: 'text-embedding-3-small',
  breakpointThresholdType: 'percentile' | 'standard_deviation' | 'interquartile',
  breakpointThresholdAmount: 70,  // percentile threshold
  bufferSize: 1,                   // sentences for context window
  minChunkSize: 100,
  maxChunkSize: 1000
};
```

**Process**:
1. Segment text into sentences
2. Generate embeddings for each sentence
3. Calculate similarity between adjacent sentences
4. Detect semantic breakpoints (topic changes)
5. Form chunks between breakpoints

#### 1.4 Page-Level Chunking
Won NVIDIA benchmarks with 0.648 accuracy and lowest variance.
- Best for: PDFs, structured documents with clear page boundaries
- Preserves document structure naturally

#### 1.5 Code-Aware Chunking
Language-specific splitting for source code.

```javascript
const codeConfig = {
  language: 'python' | 'javascript' | 'java' | 'go' | 'rust' | 'markdown',
  chunkSize: 1000,
  chunkOverlap: 0
};

// Uses language-specific separators:
// Python: class definitions, function definitions, decorators
// JavaScript: function declarations, class declarations, import statements
```

#### 1.6 Agentic/LLM-Based Chunking (Experimental)
Uses an LLM to determine optimal split points based on content understanding.

### Configurable Parameters UI

```
+----------------------------------------------------------+
|  CHUNKING CONFIGURATION                                   |
+----------------------------------------------------------+
|                                                          |
|  Strategy: [Recursive Character ▼]                       |
|                                                          |
|  Size Metric: ( ) Characters  (•) Tokens                 |
|                                                          |
|  Chunk Size:    [====|===============] 512 tokens        |
|                 Min: 100        Max: 2000                |
|                                                          |
|  Overlap:       [===|================] 50 tokens (10%)   |
|                 0%              50%                      |
|                                                          |
|  Custom Separators:                                      |
|  +--------------------------------------------------+   |
|  | \n\n  |  \n  |  .   |  [space]  |  [+ Add]      |   |
|  +--------------------------------------------------+   |
|                                                          |
|  [ ] Preserve whitespace                                 |
|  [ ] Keep separator in chunk                             |
|  [✓] Strip leading/trailing whitespace                   |
|                                                          |
+----------------------------------------------------------+
```

### Chunk Boundary Visualization

**Highlighting Approach**:
```javascript
// Color scheme for chunk visualization
const chunkColors = [
  '#E3F2FD', // Light blue
  '#FFF3E0', // Light orange
  '#E8F5E9', // Light green
  '#FCE4EC', // Light pink
  '#F3E5F5', // Light purple
  // ... cycle through for more chunks
];

// Overlap regions get a distinct pattern
const overlapStyle = {
  background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.1) 5px, rgba(0,0,0,0.1) 10px)',
  borderLeft: '2px dashed #666',
  borderRight: '2px dashed #666'
};
```

**Visual Representation**:
```
+------------------------------------------------------------------+
|  DOCUMENT PREVIEW                              [Token View] [Raw] |
+------------------------------------------------------------------+
|                                                                   |
|  ┌─────────────────────────────────────────────────────────────┐ |
|  │ Chunk 1 (245 tokens)                                    [1] │ |
|  │                                                             │ |
|  │ The quick brown fox jumps over the lazy dog. This is an    │ |
|  │ example of how text gets chunked in a RAG system. The      │ |
|  │ chunking strategy determines where boundaries are placed.   │ |
|  │                                                             │ |
|  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ |
|  │ ░░ OVERLAP (50 tokens) ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ |
|  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ |
|  └─────────────────────────────────────────────────────────────┘ |
|  ┌─────────────────────────────────────────────────────────────┐ |
|  │ Chunk 2 (312 tokens)                                    [2] │ |
|  │                                                             │ |
|  │ ░░ chunking strategy determines where boundaries are ░░░░░░ │ |
|  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ |
|  │                                                             │ |
|  │ When implementing a vector database, you need to consider   │ |
|  │ the trade-offs between chunk size and retrieval precision.  │ |
|  │ Smaller chunks offer more precise retrieval but may lose... │ |
|  └─────────────────────────────────────────────────────────────┘ |
|                                                                   |
+------------------------------------------------------------------+
|  Chunks: 12  |  Avg Size: 287 tokens  |  Total Overlap: 15%      |
+------------------------------------------------------------------+
```

### Token Count Display

Show per-chunk statistics:
- Token count (using tiktoken or similar)
- Character count
- Word count
- Sentence count
- Overlap percentage with adjacent chunks

### Implementation Libraries

```javascript
// LangChain.js text splitters
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { TokenTextSplitter } from 'langchain/text_splitter';

// For token counting
import { encoding_for_model } from 'tiktoken';

// Or use transformers.js for browser-based tokenization
import { AutoTokenizer } from '@xenova/transformers';
```

---

## 2. Embedding Model Settings

### Model Selection Interface

```
+----------------------------------------------------------+
|  EMBEDDING MODEL CONFIGURATION                            |
+----------------------------------------------------------+
|                                                          |
|  Provider: [OpenAI ▼]                                    |
|                                                          |
|  Model: [text-embedding-3-small ▼]                       |
|                                                          |
|  ┌────────────────────────────────────────────────────┐ |
|  │  MODEL INFO                                        │ |
|  │  ─────────────────────────────────────────────────│ |
|  │  Dimensions:     1536 (configurable: 256-1536)    │ |
|  │  Max Tokens:     8191                              │ |
|  │  Context Window: 8191 tokens                       │ |
|  │  Pricing:        $0.02 / 1M tokens                 │ |
|  │  Matryoshka:     ✓ Supported                       │ |
|  └────────────────────────────────────────────────────┘ |
|                                                          |
+----------------------------------------------------------+
```

### Supported Embedding Providers

#### 2.1 OpenAI Models
```javascript
const openAIModels = {
  'text-embedding-3-large': {
    dimensions: 3072,       // configurable: 256-3072
    maxTokens: 8191,
    matryoshka: true,
    pricing: 0.00013        // per 1K tokens
  },
  'text-embedding-3-small': {
    dimensions: 1536,       // configurable: 256-1536
    maxTokens: 8191,
    matryoshka: true,
    pricing: 0.00002
  },
  'text-embedding-ada-002': {
    dimensions: 1536,       // fixed
    maxTokens: 8191,
    matryoshka: false,
    pricing: 0.0001
  }
};
```

#### 2.2 Sentence Transformers (Local/HuggingFace)
```javascript
const sentenceTransformerModels = {
  'all-MiniLM-L6-v2': {
    dimensions: 384,
    maxSeqLength: 256,
    poolingStrategy: 'mean',
    normalized: true
  },
  'all-mpnet-base-v2': {
    dimensions: 768,
    maxSeqLength: 384,
    poolingStrategy: 'mean',
    normalized: true
  },
  'nomic-embed-text-v1': {
    dimensions: 768,        // configurable: 64-768 (Matryoshka)
    maxSeqLength: 8192,
    matryoshka: true
  }
};
```

#### 2.3 Cohere Models
```javascript
const cohereModels = {
  'embed-english-v3.0': {
    dimensions: 1024,
    maxTokens: 512,
    inputTypes: ['search_document', 'search_query', 'classification', 'clustering']
  },
  'embed-multilingual-v3.0': {
    dimensions: 1024,
    maxTokens: 512,
    languages: 100
  }
};
```

### Configurable Parameters

#### Batch Size
```javascript
// Critical for performance and memory management
const batchConfig = {
  batchSize: 32,            // Default, but needs tuning per model
  // VRAM usage examples for all-MiniLM-L6-v2:
  // batch=5:  2,916 MB
  // batch=10: 3,456 MB
  // batch=30: 5,956 MB (no performance gain!)

  maxConcurrent: 5,         // For API-based models
  retryOnRateLimit: true,
  rateLimitDelay: 1000      // ms
};
```

#### Matryoshka Dimensions
```javascript
// For models supporting Matryoshka Representation Learning
const matryoshkaConfig = {
  enabled: true,
  targetDimensions: 512,    // Options: 64, 128, 256, 512, 768, 1024, 1536, 3072
  // Benefits:
  // - Up to 14x smaller embedding size
  // - Up to 14x faster retrieval
  // - Minimal accuracy loss (first dimensions capture most semantics)
};
```

#### Normalization & Precision
```javascript
const processingConfig = {
  normalize: true,          // L2 normalization for cosine similarity
  precision: 'float32',     // Options: float32, int8, uint8, binary, ubinary
  truncation: 'end',        // How to handle texts > max tokens
  poolingStrategy: 'mean'   // Options: mean, cls, max
};
```

### Model Metadata Display

```
+------------------------------------------------------------------+
|  MODEL COMPARISON                                                 |
+------------------------------------------------------------------+
|                                                                   |
|  Model                    | Dims  | Max Tok | Speed  | Quality   |
|  ─────────────────────────┼───────┼─────────┼────────┼─────────  |
|  text-embedding-3-small   | 1536  | 8191    | Fast   | ████████░ |
|  all-MiniLM-L6-v2         | 384   | 256     | V.Fast | ██████░░░ |
|  all-mpnet-base-v2        | 768   | 384     | Medium | ███████░░ |
|  nomic-embed-text-v1      | 768*  | 8192    | Fast   | ████████░ |
|                                                                   |
|  * Supports Matryoshka dimension reduction                        |
|                                                                   |
+------------------------------------------------------------------+
```

---

## 3. Vector Visualization

### Dimensionality Reduction Techniques

High-dimensional embeddings (384-3072 dimensions) must be reduced to 2D or 3D for visualization.

#### 3.1 PCA (Principal Component Analysis)
```javascript
// Best for: Quick overview, preserving global structure
const pcaConfig = {
  nComponents: 2,           // or 3 for 3D
  // Pros:
  // - Fast (linear time complexity)
  // - Deterministic results
  // - Good for showing global relationships
  // Cons:
  // - May miss non-linear patterns
  // - Local clusters less visible
};
```

#### 3.2 t-SNE (t-Distributed Stochastic Neighbor Embedding)
```javascript
const tsneConfig = {
  nComponents: 2,
  perplexity: 30,           // Typically 5-50, affects cluster tightness
  learningRate: 200,
  nIterations: 1000,
  // Pros:
  // - Excellent local structure preservation
  // - Clear cluster visualization
  // Cons:
  // - Slow for large datasets
  // - Non-deterministic
  // - Can distort global structure
};
```

#### 3.3 UMAP (Uniform Manifold Approximation and Projection)
```javascript
// Recommended default for embedding visualization
const umapConfig = {
  nComponents: 2,           // or 3
  nNeighbors: 15,           // Local neighborhood size
  minDist: 0.1,             // Minimum distance between points
  metric: 'cosine',         // or 'euclidean'
  // Pros:
  // - Preserves both local AND global structure
  // - Faster than t-SNE
  // - Better for large datasets
  // - Good theoretical foundation
};
```

### Visualization UI Mockup

```
+------------------------------------------------------------------+
|  EMBEDDING SPACE VISUALIZATION                                    |
+------------------------------------------------------------------+
|                                                                   |
|  Algorithm: [UMAP ▼]  Dimensions: (•) 2D ( ) 3D                  |
|                                                                   |
|  ┌──────────────────────────────────────────────────────────────┐|
|  │                    •  •                                      │|
|  │              • •  • ••  •                                    │|
|  │           •  • •• ••• •   •           [Cluster: Technical]   │|
|  │            • •••••• •  •                                     │|
|  │              •• •• •                                         │|
|  │                                                              │|
|  │                              ▪ ▪▪                            │|
|  │         [Cluster: Legal]   ▪▪▪▪▪▪▪                          │|
|  │                            ▪▪▪▪▪▪                            │|
|  │                             ▪▪▪                              │|
|  │                                                              │|
|  │    ◆◆◆                                                       │|
|  │   ◆◆◆◆◆  [Cluster: Marketing]                               │|
|  │    ◆◆◆◆                                                      │|
|  │                                                              │|
|  └──────────────────────────────────────────────────────────────┘|
|                                                                   |
|  Color by: [Chunk Source ▼]    Size by: [Token Count ▼]          |
|                                                                   |
|  ┌─ SELECTED POINT ───────────────────────────────────────────┐  |
|  │ Chunk #47 from "technical_manual.pdf"                      │  |
|  │ Tokens: 312  |  Nearest neighbors: #45, #48, #52           │  |
|  │ "When configuring the API endpoint, ensure that..."        │  |
|  └────────────────────────────────────────────────────────────┘  |
|                                                                   |
+------------------------------------------------------------------+
```

### Similarity Matrix Heatmap

```
+------------------------------------------------------------------+
|  SIMILARITY MATRIX                                                |
+------------------------------------------------------------------+
|                                                                   |
|       C1   C2   C3   C4   C5   C6   C7   C8   C9   C10           |
|  C1   ██   ▓▓   ░░   ░░   ░░   ░░   ░░   ░░   ░░   ░░            |
|  C2   ▓▓   ██   ▓▓   ░░   ░░   ░░   ░░   ░░   ░░   ░░            |
|  C3   ░░   ▓▓   ██   ▓▓   ░░   ░░   ░░   ░░   ░░   ░░            |
|  C4   ░░   ░░   ▓▓   ██   ░░   ░░   ░░   ░░   ▓▓   ░░            |
|  C5   ░░   ░░   ░░   ░░   ██   ▓▓   ▓▓   ░░   ░░   ░░            |
|  C6   ░░   ░░   ░░   ░░   ▓▓   ██   ▓▓   ░░   ░░   ░░            |
|  C7   ░░   ░░   ░░   ░░   ▓▓   ▓▓   ██   ░░   ░░   ░░            |
|  C8   ░░   ░░   ░░   ░░   ░░   ░░   ░░   ██   ░░   ░░            |
|  C9   ░░   ░░   ░░   ▓▓   ░░   ░░   ░░   ░░   ██   ▓▓            |
|  C10  ░░   ░░   ░░   ░░   ░░   ░░   ░░   ░░   ▓▓   ██            |
|                                                                   |
|  Legend:  ██ 0.9-1.0  ▓▓ 0.7-0.9  ░░ <0.7                        |
|                                                                   |
|  Click cell to compare chunks                                     |
|                                                                   |
+------------------------------------------------------------------+
```

### React Implementation Libraries

```javascript
// For 2D/3D scatter plots
import Plot from 'react-plotly.js';

// Configuration for 3D embedding plot
const plotConfig = {
  data: [{
    type: 'scatter3d',
    mode: 'markers',
    x: reducedEmbeddings.map(e => e[0]),
    y: reducedEmbeddings.map(e => e[1]),
    z: reducedEmbeddings.map(e => e[2]),
    marker: {
      size: 5,
      color: chunkCategories,
      colorscale: 'Viridis',
      opacity: 0.8
    },
    text: chunkPreviews,
    hoverinfo: 'text'
  }],
  layout: {
    title: 'Embedding Space',
    scene: {
      xaxis: { title: 'UMAP 1' },
      yaxis: { title: 'UMAP 2' },
      zaxis: { title: 'UMAP 3' }
    }
  }
};

// For heatmaps
import { HeatmapSeries, XYPlot } from 'react-vis';
// Or use visx for more control
import { HeatmapRect } from '@visx/heatmap';
```

### Nearest Neighbor Visualization

```javascript
// Show K nearest neighbors for selected chunk
const nearestNeighborConfig = {
  k: 5,                     // Number of neighbors to show
  metric: 'cosine',         // or 'euclidean', 'dot'
  showConnections: true,    // Draw lines to neighbors
  highlightThreshold: 0.8   // Only highlight if similarity > threshold
};
```

---

## 4. Processing Pipeline UI

### Progress Tracking Dashboard

```
+------------------------------------------------------------------+
|  PROCESSING PIPELINE                                              |
+------------------------------------------------------------------+
|                                                                   |
|  ┌─ OVERVIEW ─────────────────────────────────────────────────┐  |
|  │                                                             │  |
|  │  Documents  ████████████████████████░░░░  12/15 (80%)      │  |
|  │  Chunks     ██████████████████░░░░░░░░░░  847/1,200 (71%)  │  |
|  │  Embeddings █████████████░░░░░░░░░░░░░░░  623/1,200 (52%)  │  |
|  │                                                             │  |
|  │  Estimated time remaining: 2m 34s                          │  |
|  │                                                             │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  ┌─ CURRENT OPERATION ────────────────────────────────────────┐  |
|  │                                                             │  |
|  │  Processing: quarterly_report_q4.pdf                       │  |
|  │  Status: Generating embeddings (batch 3/5)                 │  |
|  │  Chunks created: 47                                        │  |
|  │                                                             │  |
|  │  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░  60%             │  |
|  │                                                             │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  [⏸ Pause]  [⏹ Stop]  [📋 View Logs]                             |
|                                                                   |
+------------------------------------------------------------------+
```

### File Upload Interface

```
+------------------------------------------------------------------+
|  DOCUMENT UPLOAD                                                  |
+------------------------------------------------------------------+
|                                                                   |
|  ┌─────────────────────────────────────────────────────────────┐ |
|  │                                                             │ |
|  │              ┌─────────────────────────┐                    │ |
|  │              │                         │                    │ |
|  │              │    📁  Drop files here  │                    │ |
|  │              │                         │                    │ |
|  │              │    or click to browse   │                    │ |
|  │              │                         │                    │ |
|  │              └─────────────────────────┘                    │ |
|  │                                                             │ |
|  │  Supported: PDF, TXT, MD, DOCX, HTML, JSON                  │ |
|  │  Max size: 50MB per file                                    │ |
|  │                                                             │ |
|  └─────────────────────────────────────────────────────────────┘ |
|                                                                   |
|  ┌─ QUEUED FILES ─────────────────────────────────────────────┐  |
|  │                                                             │  |
|  │  📄 technical_manual.pdf          2.3 MB    ✓ Ready        │  |
|  │  📄 api_documentation.md          156 KB    ✓ Ready        │  |
|  │  📄 quarterly_report.pdf          4.1 MB    ⏳ Processing   │  |
|  │  📄 large_dataset.json            12 MB     ⏸ Queued       │  |
|  │                                                             │  |
|  │  Total: 4 files, 18.6 MB                                   │  |
|  │                                                             │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  [▶ Start Processing]  [🗑 Clear Queue]                           |
|                                                                   |
+------------------------------------------------------------------+
```

### Real-Time Processing Logs

```javascript
// Log entry types
const logTypes = {
  INFO: { icon: 'ℹ️', color: '#2196F3' },
  SUCCESS: { icon: '✓', color: '#4CAF50' },
  WARNING: { icon: '⚠️', color: '#FF9800' },
  ERROR: { icon: '✗', color: '#F44336' },
  DEBUG: { icon: '🔍', color: '#9E9E9E' }
};

// Example log output
const sampleLogs = [
  { time: '10:23:45', type: 'INFO', msg: 'Starting processing pipeline...' },
  { time: '10:23:46', type: 'INFO', msg: 'Loading document: technical_manual.pdf' },
  { time: '10:23:47', type: 'SUCCESS', msg: 'Document parsed: 45 pages, 12,340 tokens' },
  { time: '10:23:48', type: 'INFO', msg: 'Chunking with RecursiveCharacterTextSplitter...' },
  { time: '10:23:49', type: 'SUCCESS', msg: 'Created 28 chunks (avg: 441 tokens)' },
  { time: '10:23:50', type: 'INFO', msg: 'Generating embeddings (batch 1/3)...' },
  { time: '10:23:55', type: 'WARNING', msg: 'Chunk #12 exceeds max tokens, truncating...' },
  { time: '10:24:01', type: 'SUCCESS', msg: 'Embeddings complete: 28 vectors generated' }
];
```

### Error Handling & Retry UI

```
+------------------------------------------------------------------+
|  ERROR HANDLING                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  ⚠️  PROCESSING ERRORS (2)                                        |
|                                                                   |
|  ┌─────────────────────────────────────────────────────────────┐ |
|  │ ✗ corrupted_file.pdf                                        │ |
|  │   Error: Unable to parse PDF - file may be corrupted        │ |
|  │   [Retry]  [Skip]  [View Details]                           │ |
|  ├─────────────────────────────────────────────────────────────┤ |
|  │ ✗ Rate limit exceeded (OpenAI API)                          │ |
|  │   Retry in: 45 seconds                                      │ |
|  │   [Retry Now]  [Use Different Model]  [Cancel]              │ |
|  └─────────────────────────────────────────────────────────────┘ |
|                                                                   |
|  Auto-retry settings:                                             |
|  [✓] Auto-retry on rate limit (max 3 attempts)                   |
|  [✓] Auto-skip corrupted files                                   |
|  [ ] Pause pipeline on error                                      |
|                                                                   |
+------------------------------------------------------------------+
```

### React Implementation

```javascript
// Using react-dropzone for file upload
import { useDropzone } from 'react-dropzone';

const FileUpload = () => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/json': ['.json']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: handleFileDrop
  });

  return (
    <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
      <input {...getInputProps()} />
      {isDragActive ?
        <p>Drop files here...</p> :
        <p>Drag & drop files, or click to select</p>
      }
    </div>
  );
};

// Progress tracking with Web Workers for non-blocking UI
const useProcessingPipeline = () => {
  const [progress, setProgress] = useState({
    documents: { current: 0, total: 0 },
    chunks: { current: 0, total: 0 },
    embeddings: { current: 0, total: 0 }
  });

  const [logs, setLogs] = useState([]);

  const addLog = (type, message) => {
    setLogs(prev => [...prev, {
      time: new Date().toISOString(),
      type,
      message
    }]);
  };

  // ... processing logic
};
```

---

## 5. Quality & Analysis Features

### Chunk Quality Metrics

```
+------------------------------------------------------------------+
|  CHUNK QUALITY ANALYSIS                                           |
+------------------------------------------------------------------+
|                                                                   |
|  ┌─ DISTRIBUTION ─────────────────────────────────────────────┐  |
|  │                                                             │  |
|  │  Chunk Size Distribution (tokens)                          │  |
|  │                                                             │  |
|  │       ▁▂▃▅▇█████▇▅▃▂▁                                      │  |
|  │      100   300   500   700   900                           │  |
|  │                                                             │  |
|  │  Mean: 412 tokens  |  Std Dev: 89  |  Range: 156-687       │  |
|  │                                                             │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  ┌─ QUALITY INDICATORS ───────────────────────────────────────┐  |
|  │                                                             │  |
|  │  Semantic Coherence:      ████████░░  Good (0.82)          │  |
|  │  Information Density:     ███████░░░  Moderate (0.71)      │  |
|  │  Boundary Quality:        █████████░  Excellent (0.91)     │  |
|  │  Overlap Effectiveness:   ███████░░░  Good (0.75)          │  |
|  │                                                             │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
+------------------------------------------------------------------+
```

### Quality Metrics Definitions

```javascript
const qualityMetrics = {
  semanticCoherence: {
    // Measures if chunks contain semantically related content
    // Calculated by comparing embedding similarity of sentences within chunk
    description: 'How well content within each chunk relates semantically',
    calculation: 'Average intra-chunk sentence similarity',
    threshold: { good: 0.7, excellent: 0.85 }
  },

  informationDensity: {
    // Measures information content vs filler/redundancy
    description: 'Ratio of meaningful content to total content',
    calculation: 'Unique concepts / total tokens',
    threshold: { good: 0.5, excellent: 0.7 }
  },

  boundaryQuality: {
    // Measures if chunks break at natural boundaries
    description: 'How well chunk boundaries align with semantic breaks',
    calculation: 'Cross-boundary sentence similarity (lower is better)',
    threshold: { good: 0.3, excellent: 0.2 }
  },

  overlapEffectiveness: {
    // Measures if overlap captures context needed for retrieval
    description: 'How much context overlap preserves for retrieval',
    calculation: 'Retrieval improvement with overlap vs without',
    threshold: { good: 0.1, excellent: 0.2 }
  }
};
```

### Near-Duplicate Detection

```
+------------------------------------------------------------------+
|  DUPLICATE & NEAR-DUPLICATE DETECTION                             |
+------------------------------------------------------------------+
|                                                                   |
|  Similarity Threshold: [=====|==========] 0.85                    |
|                                                                   |
|  Found: 12 duplicate pairs, 34 near-duplicates                   |
|                                                                   |
|  ┌─ DUPLICATE PAIRS (similarity > 0.95) ──────────────────────┐  |
|  │                                                             │  |
|  │  Chunk #23 ←→ Chunk #89        Similarity: 0.98            │  |
|  │  "The API endpoint accepts..."  [Compare] [Remove One]     │  |
|  │                                                             │  |
|  │  Chunk #45 ←→ Chunk #112       Similarity: 0.96            │  |
|  │  "Configuration settings..."    [Compare] [Remove One]     │  |
|  │                                                             │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  ┌─ NEAR-DUPLICATES (0.85-0.95) ──────────────────────────────┐  |
|  │                                                             │  |
|  │  Cluster 1: 5 similar chunks (avg similarity: 0.89)        │  |
|  │  Topic: "Installation procedures"    [View All] [Merge]    │  |
|  │                                                             │  |
|  │  Cluster 2: 3 similar chunks (avg similarity: 0.87)        │  |
|  │  Topic: "Error handling"             [View All] [Merge]    │  |
|  │                                                             │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  [Auto-Deduplicate]  [Export Duplicates Report]                  |
|                                                                   |
+------------------------------------------------------------------+
```

### Implementation

```javascript
// Using SemHash approach for deduplication
const deduplicationConfig = {
  similarityThreshold: 0.85,    // Cosine similarity
  duplicateThreshold: 0.95,     // Exact/near-exact duplicates
  clusteringMethod: 'DBSCAN',
  eps: 0.15,                    // DBSCAN epsilon
  minSamples: 2
};

// Threshold guidelines by content type:
const thresholdGuidelines = {
  titles: 0.8,          // Lower - allow minor phrasing differences
  descriptions: 0.7,    // Lower - often differ in structure
  technicalDocs: 0.9,   // Higher - precision matters
  general: 0.85         // Default
};
```

### Coverage Analysis

```
+------------------------------------------------------------------+
|  TOPIC COVERAGE ANALYSIS                                          |
+------------------------------------------------------------------+
|                                                                   |
|  Auto-detected Topics:                                            |
|                                                                   |
|  ┌─────────────────────────────────────────────────────────────┐ |
|  │  Topic                    | Chunks | Coverage | Depth       │ |
|  │  ─────────────────────────┼────────┼──────────┼────────────│ |
|  │  API Integration          | 45     | ████████ | High        │ |
|  │  Authentication           | 32     | ██████░░ | Medium      │ |
|  │  Error Handling           | 28     | █████░░░ | Medium      │ |
|  │  Configuration            | 23     | █████░░░ | Medium      │ |
|  │  Deployment               | 12     | ███░░░░░ | Low         │ |
|  │  Troubleshooting          | 8      | ██░░░░░░ | Sparse      │ |
|  └─────────────────────────────────────────────────────────────┘ |
|                                                                   |
|  ⚠️  Gaps Detected:                                               |
|  • "Troubleshooting" has limited coverage (8 chunks)             |
|  • No chunks found for: "Performance optimization", "Security"   |
|                                                                   |
+------------------------------------------------------------------+
```

### Search/Query Testing Interface

```
+------------------------------------------------------------------+
|  RETRIEVAL TESTING                                                |
+------------------------------------------------------------------+
|                                                                   |
|  Test Query: [What is the API rate limit?                    ] 🔍 |
|                                                                   |
|  Settings:  Top-K: [5]   Similarity Threshold: [0.7]             |
|                                                                   |
|  ┌─ RESULTS ──────────────────────────────────────────────────┐  |
|  │                                                             │  |
|  │  1. Chunk #67 (Score: 0.94)                                │  |
|  │     Source: api_documentation.md                           │  |
|  │     "The API has a rate limit of 100 requests per minute   │  |
|  │      for standard accounts. Enterprise accounts have..."    │  |
|  │     [View Full] [View in Context]                          │  |
|  │                                                             │  |
|  │  2. Chunk #123 (Score: 0.87)                               │  |
|  │     Source: technical_manual.pdf                           │  |
|  │     "Rate limiting is implemented using a token bucket     │  |
|  │      algorithm. When limits are exceeded..."                │  |
|  │     [View Full] [View in Context]                          │  |
|  │                                                             │  |
|  │  3. Chunk #45 (Score: 0.82)                                │  |
|  │     Source: faq.md                                         │  |
|  │     "Q: Why am I getting 429 errors? A: This indicates     │  |
|  │      you've exceeded the API rate limit..."                 │  |
|  │     [View Full] [View in Context]                          │  |
|  │                                                             │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  Retrieval Quality:  Relevance: ████████░░  Diversity: ██████░░░ |
|                                                                   |
+------------------------------------------------------------------+
```

---

## 6. Export & Integration

### Export Formats

#### 6.1 Vector Database Formats

```javascript
// ChromaDB format
const chromaExport = {
  ids: ['chunk_1', 'chunk_2', ...],
  embeddings: [[0.1, 0.2, ...], [0.3, 0.4, ...], ...],
  metadatas: [
    { source: 'doc1.pdf', page: 1, tokens: 256 },
    { source: 'doc1.pdf', page: 2, tokens: 312 },
    ...
  ],
  documents: ['chunk text 1', 'chunk text 2', ...]
};

// Pinecone format
const pineconeExport = {
  vectors: [
    {
      id: 'chunk_1',
      values: [0.1, 0.2, ...],
      metadata: { source: 'doc1.pdf', page: 1, text: 'chunk text...' }
    },
    ...
  ],
  namespace: 'my-documents'
};

// Qdrant format
const qdrantExport = {
  points: [
    {
      id: 1,
      vector: [0.1, 0.2, ...],
      payload: {
        source: 'doc1.pdf',
        page: 1,
        text: 'chunk text...',
        tokens: 256
      }
    },
    ...
  ]
};
```

#### 6.2 Generic JSON Export

```javascript
const jsonExport = {
  version: '1.0',
  exportDate: '2024-01-15T10:30:00Z',
  config: {
    chunkingStrategy: 'recursive',
    chunkSize: 512,
    chunkOverlap: 50,
    embeddingModel: 'text-embedding-3-small',
    embeddingDimensions: 1536
  },
  statistics: {
    totalDocuments: 15,
    totalChunks: 423,
    avgChunkSize: 387,
    processingTime: '2m 34s'
  },
  chunks: [
    {
      id: 'chunk_001',
      text: 'The quick brown fox...',
      embedding: [0.1, 0.2, ...],  // Optional: can be stored separately
      metadata: {
        source: 'document.pdf',
        page: 1,
        startChar: 0,
        endChar: 512,
        tokens: 128,
        overlapPrev: 0,
        overlapNext: 50
      }
    },
    ...
  ]
};
```

#### 6.3 CSV Export (for analysis tools)

```csv
chunk_id,source,page,start_char,end_char,tokens,text_preview
chunk_001,document.pdf,1,0,512,128,"The quick brown fox..."
chunk_002,document.pdf,1,462,974,134,"...jumps over the lazy dog..."
```

### Export Configuration UI

```
+------------------------------------------------------------------+
|  EXPORT OPTIONS                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  Format: [ChromaDB ▼]                                            |
|                                                                   |
|  Include:                                                         |
|  [✓] Embeddings                                                  |
|  [✓] Chunk text                                                  |
|  [✓] Metadata (source, page, tokens)                             |
|  [✓] Chunking configuration                                      |
|  [ ] Processing logs                                              |
|                                                                   |
|  Embedding Format:                                                |
|  (•) Full precision (float32)                                    |
|  ( ) Reduced precision (float16) - 50% smaller                   |
|  ( ) Quantized (int8) - 75% smaller                              |
|                                                                   |
|  Output:                                                          |
|  (•) Single JSON file                                            |
|  ( ) Split files (embeddings separate)                           |
|  ( ) ZIP archive                                                  |
|                                                                   |
|  [Export]  [Preview Export]                                       |
|                                                                   |
+------------------------------------------------------------------+
```

### Chunking Configuration Export

```javascript
// Save/load chunking configurations
const chunkingConfigExport = {
  name: 'Technical Documentation Config',
  version: '1.0',
  strategy: 'recursive',
  parameters: {
    chunkSize: 512,
    chunkOverlap: 50,
    sizeMetric: 'tokens',
    separators: ['\n\n', '\n', '. ', ' '],
    keepSeparator: false,
    stripWhitespace: true
  },
  embeddingModel: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536,
    normalize: true
  }
};

// Can be loaded to reproduce exact chunking
```

### Direct Vector DB Integration

```javascript
// ChromaDB integration
import { ChromaClient } from 'chromadb';

const uploadToChroma = async (chunks, embeddings) => {
  const client = new ChromaClient();
  const collection = await client.getOrCreateCollection({
    name: 'my-documents',
    metadata: { 'hnsw:space': 'cosine' }
  });

  await collection.add({
    ids: chunks.map((_, i) => `chunk_${i}`),
    embeddings: embeddings,
    metadatas: chunks.map(c => c.metadata),
    documents: chunks.map(c => c.text)
  });
};

// Pinecone integration
import { Pinecone } from '@pinecone-database/pinecone';

const uploadToPinecone = async (chunks, embeddings) => {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index('my-index');

  const vectors = chunks.map((chunk, i) => ({
    id: `chunk_${i}`,
    values: embeddings[i],
    metadata: { ...chunk.metadata, text: chunk.text }
  }));

  await index.namespace('documents').upsert(vectors);
};
```

---

## 7. Existing Tools & Inspiration

### 7.1 Arize Phoenix

**Key Features**:
- Open-source LLM observability built on OpenTelemetry
- Runs locally (Jupyter notebook, container)
- Automatic topic clustering of embeddings
- Visual inspection of problematic clusters
- RAG-specific evaluation metrics (faithfulness, correctness)

**UI Patterns to Adopt**:
- Embedding clustering with semantic topic labels
- Color-coded quality metrics overlay
- Step-by-step trace visualization
- Interactive cluster selection and inspection

**Reference**: [Arize Phoenix Documentation](https://arize.com/docs/phoenix)

### 7.2 LangSmith

**Key Features**:
- Deep LangChain integration
- Nested execution step visualization
- Prompt playground for experimentation
- Dataset management and collaboration

**UI Patterns to Adopt**:
- Drill-down trace view (embedding -> search -> ranking -> prompt -> response)
- Side-by-side comparison of different configurations
- Collaborative feedback on outputs
- Run history and version comparison

**Reference**: [LangSmith Documentation](https://docs.smith.langchain.com/)

### 7.3 Weights & Biases

**Key Features**:
- Embedding Projector with PCA/UMAP/t-SNE
- Configurable visualization parameters
- Image overlay on hover for multimodal
- Tables for logging embedding data

**UI Patterns to Adopt**:
- Algorithm parameter configuration panel
- Color-by-category visualization
- Interactive 2D projection with hover details
- Experiment tracking and comparison

**Reference**: [W&B Embedding Projector](https://docs.wandb.ai/models/app/features/panels/query-panels/embedding-projector)

### 7.4 Nomic Atlas

**Key Features**:
- Massive dataset visualization (millions of points)
- Automatic topic detection and labeling
- Multiple search modes (query, document, embedding)
- Shareable map URLs
- Selection tools and filtering

**UI Patterns to Adopt**:
- Automatic topic labeling on clusters
- View settings panel for color/size customization
- Selection lasso and filter tools
- Topic legend with counts
- Zoom-to-cluster navigation

**Reference**: [Nomic Atlas Documentation](https://docs.nomic.ai/)

### 7.5 TensorFlow Embedding Projector

**Key Features**:
- 3D interactive visualization
- Multiple algorithms (PCA, t-SNE, UMAP)
- Label search and filtering
- Nearest neighbor exploration

**UI Patterns to Adopt**:
- 3D camera controls
- Point selection with neighbor highlighting
- Metadata filtering panel
- Algorithm switching without re-upload

**Reference**: [TensorFlow Projector](https://projector.tensorflow.org/)

### 7.6 Humanloop (sunset)

**Key Features** (historical):
- Playground for prompt experimentation
- Version control for prompts
- Collaboration between engineers and domain experts
- A/B testing of configurations

**UI Patterns to Adopt**:
- Configuration version history
- Side-by-side comparison
- Non-technical user-friendly interface
- Export/import of configurations

### UI Pattern Summary

| Pattern | Tools Using It | Priority |
|---------|---------------|----------|
| Interactive 2D/3D scatter plot | All | High |
| Algorithm parameter controls | W&B, TF Projector | High |
| Topic auto-labeling | Phoenix, Atlas | Medium |
| Color-by-category | All | High |
| Nearest neighbor display | TF Projector, Atlas | High |
| Configuration versioning | LangSmith, Humanloop | Medium |
| Trace/step visualization | LangSmith, Phoenix | Medium |
| Selection/filtering tools | Atlas, W&B | High |
| Shareable views/URLs | Atlas | Low |
| Hover details/preview | All | High |

---

## 8. React Implementation Recommendations

### Recommended Tech Stack

```javascript
// Core Framework
"react": "^18.2.0",
"typescript": "^5.0.0",

// State Management
"zustand": "^4.4.0",        // Simple, performant state
// OR
"jotai": "^2.5.0",          // Atomic state for complex UIs

// UI Components
"@radix-ui/react-*": "*",   // Accessible primitives
"tailwindcss": "^3.4.0",    // Utility-first CSS
"lucide-react": "*",        // Icons

// Visualization
"react-plotly.js": "^2.6.0", // 2D/3D scatter plots
"plotly.js": "^2.27.0",
"@visx/visx": "^3.5.0",      // Low-level D3 wrapper for heatmaps
// OR
"recharts": "^2.10.0",       // Simpler charts

// File Handling
"react-dropzone": "^14.2.0", // Drag and drop uploads
"pdfjs-dist": "^4.0.0",      // PDF parsing

// ML/Embeddings (browser-based option)
"@xenova/transformers": "^2.17.0",  // Run models in browser

// Utilities
"tiktoken": "^1.0.0",        // Token counting
"uuid": "^9.0.0",
"date-fns": "^3.0.0"
```

### Component Architecture

```
src/
├── components/
│   ├── upload/
│   │   ├── FileDropzone.tsx
│   │   ├── FileQueue.tsx
│   │   └── UploadProgress.tsx
│   ├── chunking/
│   │   ├── ChunkingConfig.tsx
│   │   ├── ChunkPreview.tsx
│   │   ├── ChunkHighlighter.tsx
│   │   └── SeparatorEditor.tsx
│   ├── embedding/
│   │   ├── ModelSelector.tsx
│   │   ├── ModelMetadata.tsx
│   │   ├── BatchConfig.tsx
│   │   └── DimensionSelector.tsx
│   ├── visualization/
│   │   ├── EmbeddingPlot.tsx
│   │   ├── SimilarityHeatmap.tsx
│   │   ├── ClusterView.tsx
│   │   └── NearestNeighbors.tsx
│   ├── analysis/
│   │   ├── QualityMetrics.tsx
│   │   ├── DuplicateDetector.tsx
│   │   ├── CoverageAnalysis.tsx
│   │   └── QueryTester.tsx
│   ├── export/
│   │   ├── ExportConfig.tsx
│   │   ├── FormatSelector.tsx
│   │   └── ExportPreview.tsx
│   └── common/
│       ├── ProgressBar.tsx
│       ├── LogViewer.tsx
│       ├── Slider.tsx
│       └── Tabs.tsx
├── hooks/
│   ├── useChunking.ts
│   ├── useEmbeddings.ts
│   ├── useVisualization.ts
│   └── useProcessingPipeline.ts
├── stores/
│   ├── documentStore.ts
│   ├── chunkStore.ts
│   ├── embeddingStore.ts
│   └── configStore.ts
├── services/
│   ├── chunking/
│   │   ├── recursiveChunker.ts
│   │   ├── semanticChunker.ts
│   │   └── codeChunker.ts
│   ├── embedding/
│   │   ├── openaiEmbedder.ts
│   │   ├── localEmbedder.ts
│   │   └── cohereEmbedder.ts
│   ├── visualization/
│   │   ├── umap.ts
│   │   ├── tsne.ts
│   │   └── pca.ts
│   └── export/
│       ├── chromaExporter.ts
│       ├── pineconeExporter.ts
│       └── jsonExporter.ts
└── workers/
    ├── chunkingWorker.ts    // Web Worker for non-blocking chunking
    └── embeddingWorker.ts   // Web Worker for local embeddings
```

### Key Component Examples

#### ChunkHighlighter Component

```tsx
// components/chunking/ChunkHighlighter.tsx
import React from 'react';

interface Chunk {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  tokenCount: number;
  isOverlap?: boolean;
}

interface ChunkHighlighterProps {
  originalText: string;
  chunks: Chunk[];
  selectedChunkId?: string;
  onChunkClick?: (chunk: Chunk) => void;
}

const CHUNK_COLORS = [
  'bg-blue-100 border-blue-300',
  'bg-orange-100 border-orange-300',
  'bg-green-100 border-green-300',
  'bg-pink-100 border-pink-300',
  'bg-purple-100 border-purple-300',
];

export const ChunkHighlighter: React.FC<ChunkHighlighterProps> = ({
  originalText,
  chunks,
  selectedChunkId,
  onChunkClick
}) => {
  const renderChunks = () => {
    return chunks.map((chunk, index) => {
      const colorClass = CHUNK_COLORS[index % CHUNK_COLORS.length];
      const isSelected = chunk.id === selectedChunkId;

      return (
        <div
          key={chunk.id}
          className={`
            relative p-3 my-2 rounded border-l-4 cursor-pointer
            ${colorClass}
            ${isSelected ? 'ring-2 ring-blue-500' : ''}
            ${chunk.isOverlap ? 'opacity-70 bg-striped' : ''}
          `}
          onClick={() => onChunkClick?.(chunk)}
        >
          <div className="absolute top-1 right-2 text-xs text-gray-500">
            Chunk {index + 1} · {chunk.tokenCount} tokens
          </div>
          <p className="text-sm whitespace-pre-wrap mt-4">
            {chunk.text}
          </p>
        </div>
      );
    });
  };

  return (
    <div className="chunk-highlighter">
      {renderChunks()}
    </div>
  );
};
```

#### EmbeddingPlot Component

```tsx
// components/visualization/EmbeddingPlot.tsx
import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';

interface Point {
  id: string;
  coords: [number, number] | [number, number, number];
  label: string;
  category: string;
  preview: string;
}

interface EmbeddingPlotProps {
  points: Point[];
  dimensions: 2 | 3;
  colorBy: 'category' | 'cluster' | 'source';
  onPointClick?: (point: Point) => void;
  selectedPointId?: string;
}

export const EmbeddingPlot: React.FC<EmbeddingPlotProps> = ({
  points,
  dimensions,
  colorBy,
  onPointClick,
  selectedPointId
}) => {
  const plotData = useMemo(() => {
    const categories = [...new Set(points.map(p => p.category))];

    return categories.map(category => {
      const categoryPoints = points.filter(p => p.category === category);

      return {
        type: dimensions === 3 ? 'scatter3d' : 'scatter',
        mode: 'markers',
        name: category,
        x: categoryPoints.map(p => p.coords[0]),
        y: categoryPoints.map(p => p.coords[1]),
        ...(dimensions === 3 && { z: categoryPoints.map(p => p.coords[2]) }),
        text: categoryPoints.map(p => p.preview),
        customdata: categoryPoints.map(p => p.id),
        hoverinfo: 'text',
        marker: {
          size: categoryPoints.map(p =>
            p.id === selectedPointId ? 12 : 6
          ),
          opacity: 0.8
        }
      };
    });
  }, [points, dimensions, selectedPointId]);

  const layout = {
    title: 'Embedding Space',
    hovermode: 'closest',
    ...(dimensions === 3 ? {
      scene: {
        xaxis: { title: 'Dim 1' },
        yaxis: { title: 'Dim 2' },
        zaxis: { title: 'Dim 3' }
      }
    } : {
      xaxis: { title: 'Dim 1' },
      yaxis: { title: 'Dim 2' }
    })
  };

  return (
    <Plot
      data={plotData}
      layout={layout}
      onClick={(event) => {
        const pointId = event.points[0]?.customdata;
        const point = points.find(p => p.id === pointId);
        if (point) onPointClick?.(point);
      }}
      style={{ width: '100%', height: '500px' }}
    />
  );
};
```

#### Processing Pipeline Hook

```tsx
// hooks/useProcessingPipeline.ts
import { useState, useCallback, useRef } from 'react';
import { useChunkStore } from '../stores/chunkStore';
import { useEmbeddingStore } from '../stores/embeddingStore';

type ProcessingStatus = 'idle' | 'chunking' | 'embedding' | 'complete' | 'error';

interface ProcessingProgress {
  status: ProcessingStatus;
  documentsProcessed: number;
  totalDocuments: number;
  chunksCreated: number;
  embeddingsGenerated: number;
  totalEmbeddings: number;
  currentFile: string;
  errors: Error[];
  logs: LogEntry[];
}

interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

export const useProcessingPipeline = () => {
  const [progress, setProgress] = useState<ProcessingProgress>({
    status: 'idle',
    documentsProcessed: 0,
    totalDocuments: 0,
    chunksCreated: 0,
    embeddingsGenerated: 0,
    totalEmbeddings: 0,
    currentFile: '',
    errors: [],
    logs: []
  });

  const abortController = useRef<AbortController | null>(null);
  const { addChunks, chunkingConfig } = useChunkStore();
  const { generateEmbeddings, embeddingConfig } = useEmbeddingStore();

  const log = useCallback((level: LogEntry['level'], message: string) => {
    setProgress(prev => ({
      ...prev,
      logs: [...prev.logs, { timestamp: new Date(), level, message }]
    }));
  }, []);

  const processDocuments = useCallback(async (files: File[]) => {
    abortController.current = new AbortController();

    setProgress(prev => ({
      ...prev,
      status: 'chunking',
      totalDocuments: files.length,
      documentsProcessed: 0
    }));

    log('info', `Starting processing of ${files.length} documents`);

    const allChunks = [];

    for (const file of files) {
      if (abortController.current.signal.aborted) break;

      setProgress(prev => ({ ...prev, currentFile: file.name }));
      log('info', `Processing: ${file.name}`);

      try {
        // Parse document
        const text = await parseDocument(file);
        log('success', `Parsed ${file.name}: ${text.length} characters`);

        // Chunk document
        const chunks = await chunkDocument(text, chunkingConfig);
        allChunks.push(...chunks);

        setProgress(prev => ({
          ...prev,
          documentsProcessed: prev.documentsProcessed + 1,
          chunksCreated: prev.chunksCreated + chunks.length
        }));

        log('success', `Created ${chunks.length} chunks from ${file.name}`);

      } catch (error) {
        log('error', `Failed to process ${file.name}: ${error.message}`);
        setProgress(prev => ({
          ...prev,
          errors: [...prev.errors, error]
        }));
      }
    }

    // Generate embeddings
    if (allChunks.length > 0 && !abortController.current.signal.aborted) {
      setProgress(prev => ({
        ...prev,
        status: 'embedding',
        totalEmbeddings: allChunks.length
      }));

      log('info', `Generating embeddings for ${allChunks.length} chunks`);

      const batchSize = embeddingConfig.batchSize;
      for (let i = 0; i < allChunks.length; i += batchSize) {
        if (abortController.current.signal.aborted) break;

        const batch = allChunks.slice(i, i + batchSize);
        await generateEmbeddings(batch);

        setProgress(prev => ({
          ...prev,
          embeddingsGenerated: Math.min(i + batchSize, allChunks.length)
        }));
      }

      log('success', `Generated ${allChunks.length} embeddings`);
    }

    addChunks(allChunks);

    setProgress(prev => ({ ...prev, status: 'complete' }));
    log('success', 'Processing complete!');

  }, [chunkingConfig, embeddingConfig, addChunks, generateEmbeddings, log]);

  const cancel = useCallback(() => {
    abortController.current?.abort();
    setProgress(prev => ({ ...prev, status: 'idle' }));
    log('warning', 'Processing cancelled');
  }, [log]);

  return {
    progress,
    processDocuments,
    cancel,
    isProcessing: progress.status !== 'idle' && progress.status !== 'complete'
  };
};
```

### Performance Considerations

1. **Web Workers**: Use for chunking and local embeddings to avoid blocking UI
2. **Virtual Scrolling**: For large chunk lists (100+ items)
3. **Memoization**: Heavy use of `useMemo` and `useCallback` for visualization
4. **Progressive Loading**: Load embeddings in batches for visualization
5. **Debouncing**: Debounce configuration changes that trigger re-processing

### Browser-Based vs API-Based

```javascript
// Browser-based (Transformers.js) - good for privacy, no API costs
import { pipeline } from '@xenova/transformers';

const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
const embeddings = await embedder(texts, { pooling: 'mean', normalize: true });

// API-based (OpenAI) - better quality, requires API key
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: texts,
  dimensions: 512  // Matryoshka
});
```

---

## Sources

### Chunking Strategies
- [Best Chunking Strategies for RAG in 2025 - Firecrawl](https://www.firecrawl.dev/blog/best-chunking-strategies-rag-2025)
- [Chunking Strategies for RAG - Weaviate](https://weaviate.io/blog/chunking-strategies-for-rag)
- [The Ultimate Guide to RAG Chunking Strategies - Agenta](https://agenta.ai/blog/the-ultimate-guide-for-chunking-strategies)
- [Chunking Strategies for RAG Tutorial - IBM](https://www.ibm.com/think/tutorials/chunking-strategies-for-rag-with-langchain-watsonx-ai)
- [Breaking Up is Hard to Do: Chunking in RAG - Stack Overflow](https://stackoverflow.blog/2024/12/27/breaking-up-is-hard-to-do-chunking-in-rag-applications/)

### Embedding Models
- [Sentence Transformers Documentation](https://sbert.net/docs/package_reference/sentence_transformer/SentenceTransformer.html)
- [Computing Embeddings - SBERT](https://sbert.net/examples/sentence_transformer/applications/computing-embeddings/README.html)
- [Batch Size for Sentence Transformers - Medium](https://medium.com/@vici0549/it-is-crucial-to-properly-set-the-batch-size-when-using-sentence-transformers-for-embedding-models-3d41a3f8b649)
- [Matryoshka Embeddings - HuggingFace](https://huggingface.co/blog/matryoshka)
- [Matryoshka Representation Learning - Zilliz](https://zilliz.com/blog/matryoshka-representation-learning-method-behind-openai-text-embeddings)

### Visualization
- [UMAP Interactive Visualizations](https://umap-learn.readthedocs.io/en/latest/interactive_viz.html)
- [T-SNE and UMAP Projections - Plotly](https://plotly.com/python/t-sne-and-umap-projections/)
- [W&B Embedding Projector](https://docs.wandb.ai/models/app/features/panels/query-panels/embedding-projector)
- [Visualizing Embeddings in Atlas - OpenAI Cookbook](https://cookbook.openai.com/examples/third_party/visualizing_embeddings_with_atlas)

### Quality & Analysis
- [RAG Evaluation Guide - Evidently AI](https://www.evidentlyai.com/llm-guide/rag-evaluation)
- [Finding Best Chunking Strategy - NVIDIA](https://developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses/)
- [SemHash Deduplication - GitHub](https://github.com/MinishLab/semhash)
- [Semantic Deduplication - NVIDIA NeMo Curator](https://docs.nvidia.com/nemo/curator/latest/curate-text/process-data/deduplication/semdedup.html)

### Tools & Platforms
- [Arize Phoenix Documentation](https://arize.com/docs/phoenix)
- [Nomic Atlas Documentation](https://docs.nomic.ai/)
- [LangSmith vs Phoenix Comparison](https://medium.com/@aunraza021/langsmith-vs-phoenix-by-arize-ai-choosing-the-right-tool-for-llm-observability-0b4c2f21c077)
- [Best LLM Observability Tools - ZenML](https://www.zenml.io/blog/best-llm-observability-tools)

### React Implementation
- [React Dropzone](https://react-dropzone.js.org/)
- [React Plotly.js](https://plotly.com/javascript/react/)
- [3D Scatter Plots - Plotly](https://plotly.com/javascript/3d-scatter-plots/)
- [LangChain Text Splitters](https://docs.langchain.com/oss/python/integrations/splitters)
- [RecursiveCharacterTextSplitter - LangChain Tutorial](https://langchain-opentutorial.gitbook.io/langchain-opentutorial/07-textsplitter/02-recursivecharactertextsplitter)

### Vector Databases
- [Best Vector Databases 2026 - DataCamp](https://www.datacamp.com/blog/the-top-5-vector-databases)
- [Vector Database Comparison - LiquidMetal AI](https://liquidmetal.ai/casesAndBlogs/vector-comparison/)
- [ChromaDB, Pinecone, Qdrant Guide - Medium](https://mehmetozkaya.medium.com/exploring-vector-databases-pinecone-chroma-weaviate-qdrant-milvus-pgvector-and-redis-f0618fe9e92d)
