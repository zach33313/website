// Document types
export interface ParsedDocument {
  filename: string;
  content: string;
  metadata: {
    file_type: string;
    char_count: number;
    word_count: number;
    line_count: number;
  };
}

// Chunking types
export type ChunkingStrategy = 'recursive' | 'fixed' | 'sentence' | 'paragraph' | 'semantic';

export interface ChunkingConfig {
  strategy: ChunkingStrategy;
  chunk_size: number;
  chunk_overlap: number;
  separators?: string[];
}

export interface Chunk {
  id: string;
  content: string;
  metadata: {
    chunk_index: number;
    start_char: number;
    end_char: number;
    char_count: number;
    word_count: number;
  };
}

export interface ChunkPreview {
  preview: string;
  start: number;
  end: number;
  length: number;
}

export interface ChunkingResult {
  chunks: Chunk[];
  stats: {
    total_chunks: number;
    avg_chunk_size: number;
    min_chunk_size: number;
    max_chunk_size: number;
    total_chars: number;
  };
}

// Embedding types
export interface EmbeddingModel {
  id: string;
  name: string;
  dimensions: number;
  max_tokens: number;
  description: string;
}

export interface EmbeddingResult {
  embeddings: number[][];
  model: string;
  dimensions: number;
  processing_time: number;
}

// Visualization types
export type ReductionMethod = 'umap' | 'tsne' | 'pca';

export interface Point2D {
  x: number;
  y: number;
  chunk_id: string;
  chunk_index: number;
  preview: string;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface SimilarityMatrix {
  matrix: number[][];
  chunk_ids: string[];
}

export interface NearestNeighbor {
  chunk_id: string;
  chunk_index: number;
  similarity: number;
  preview: string;
}

export interface ClusterResult {
  labels: number[];
  n_clusters: number;
  chunk_ids: string[];
}

// Export types
export type ExportFormat = 'chromadb' | 'pinecone' | 'qdrant' | 'json' | 'csv';

export interface ExportConfig {
  format: ExportFormat;
  collection_name?: string;
  include_metadata?: boolean;
}

// App state
export interface AppState {
  // Document state
  document: ParsedDocument | null;
  isUploading: boolean;

  // Chunking state
  chunkingConfig: ChunkingConfig;
  chunks: Chunk[];
  isChunking: boolean;
  selectedChunkIndex: number | null;

  // Embedding state
  embeddingModel: string;
  embeddings: number[][] | null;
  isEmbedding: boolean;

  // Visualization state
  reductionMethod: ReductionMethod;
  points2D: Point2D[] | null;
  points3D: Point3D[] | null;
  similarityMatrix: SimilarityMatrix | null;
  clusters: ClusterResult | null;

  // UI state
  activeTab: 'upload' | 'chunking' | 'embedding' | 'visualization' | 'export';
  error: string | null;
}

// API response types
export interface ApiError {
  detail: string;
}
