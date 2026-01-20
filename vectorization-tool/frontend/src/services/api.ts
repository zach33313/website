import type {
  ParsedDocument,
  ChunkingConfig,
  ChunkingResult,
  EmbeddingModel,
  EmbeddingResult,
  ReductionMethod,
  Point2D,
  Point3D,
  SimilarityMatrix,
  NearestNeighbor,
  ClusterResult,
  ExportFormat,
} from '../types';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    // Handle FastAPI validation errors (422) which return an array
    let message = 'Request failed';
    if (Array.isArray(error.detail)) {
      message = error.detail.map((e: { loc?: string[]; msg?: string }) =>
        `${e.loc?.join('.')}: ${e.msg}`
      ).join('; ');
    } else if (typeof error.detail === 'string') {
      message = error.detail;
    }
    throw new ApiError(response.status, message);
  }
  return response.json();
}

// Document endpoints
export async function uploadDocument(file: File): Promise<ParsedDocument> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  return handleResponse<ParsedDocument>(response);
}

export async function parseText(text: string, filename: string = 'input.txt'): Promise<ParsedDocument> {
  const response = await fetch(`${API_BASE}/documents/parse-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, filename }),
  });

  return handleResponse<ParsedDocument>(response);
}

// Chunking endpoints
export async function chunkText(
  text: string,
  config: ChunkingConfig
): Promise<ChunkingResult> {
  const response = await fetch(`${API_BASE}/chunking/chunk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      strategy: config.strategy,
      chunk_size: config.chunk_size,
      chunk_overlap: config.chunk_overlap,
      separators: config.separators,
    }),
  });

  return handleResponse<ChunkingResult>(response);
}

export async function previewChunkBoundaries(
  text: string,
  config: ChunkingConfig
): Promise<{ boundaries: { start: number; end: number; preview: string }[] }> {
  const response = await fetch(`${API_BASE}/chunking/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      strategy: config.strategy,
      chunk_size: config.chunk_size,
      chunk_overlap: config.chunk_overlap,
      separators: config.separators,
    }),
  });

  return handleResponse(response);
}

export async function countTokens(
  text: string,
  model: string = 'cl100k_base'
): Promise<{ token_count: number; tokens: string[] }> {
  const response = await fetch(`${API_BASE}/chunking/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model }),
  });

  return handleResponse(response);
}

// Embedding endpoints
export async function listEmbeddingModels(): Promise<{ models: EmbeddingModel[] }> {
  const response = await fetch(`${API_BASE}/embeddings/models`);
  return handleResponse(response);
}

export async function generateEmbeddings(
  texts: string[],
  model: string
): Promise<EmbeddingResult> {
  const response = await fetch(`${API_BASE}/embeddings/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, model }),
  });

  return handleResponse<EmbeddingResult>(response);
}

// Visualization endpoints
export async function reduceDimensions(
  embeddings: number[][],
  method: ReductionMethod,
  n_components: 2 | 3,
  chunk_previews?: string[]
): Promise<{ points: Point2D[] | Point3D[] }> {
  const response = await fetch(`${API_BASE}/visualization/reduce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeddings,
      method,
      n_components,
      chunk_previews,
    }),
  });

  return handleResponse(response);
}

export async function computeSimilarityMatrix(
  embeddings: number[][],
  chunk_ids: string[]
): Promise<SimilarityMatrix> {
  const response = await fetch(`${API_BASE}/visualization/similarity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeddings, chunk_ids }),
  });

  return handleResponse<SimilarityMatrix>(response);
}

export async function findNearestNeighbors(
  embeddings: number[][],
  query_index: number,
  k: number,
  chunk_previews?: string[]
): Promise<{ neighbors: NearestNeighbor[] }> {
  const response = await fetch(`${API_BASE}/visualization/neighbors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeddings,
      query_index,
      k,
      chunk_previews,
    }),
  });

  return handleResponse(response);
}

export async function clusterEmbeddings(
  embeddings: number[][],
  n_clusters: number,
  chunk_ids: string[]
): Promise<ClusterResult> {
  const response = await fetch(`${API_BASE}/visualization/cluster`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeddings, n_clusters, chunk_ids }),
  });

  return handleResponse<ClusterResult>(response);
}

// Export endpoints
export async function exportData(
  chunks: { id: string; content: string; metadata: Record<string, unknown> }[],
  embeddings: number[][],
  format: ExportFormat,
  collection_name: string = 'documents'
): Promise<{ data: unknown }> {
  const response = await fetch(`${API_BASE}/export/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chunks,
      embeddings,
      format,
      collection_name,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Export failed' }));
    throw new ApiError(response.status, error.detail);
  }

  return { data: await response.json() };
}

export async function downloadExport(
  chunks: { id: string; content: string; metadata: Record<string, unknown> }[],
  embeddings: number[][],
  format: 'json' | 'csv',
  filename: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/export/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chunks,
      embeddings,
      format,
      collection_name: filename.replace(/\.(json|csv)$/, ''),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Export failed' }));
    throw new ApiError(response.status, error.detail);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
