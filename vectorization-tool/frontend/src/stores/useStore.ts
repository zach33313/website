import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  ParsedDocument,
  ChunkingConfig,
  Chunk,
  ReductionMethod,
  Point2D,
  Point3D,
  SimilarityMatrix,
  ClusterResult,
} from '../types';

interface Store {
  // Document state
  document: ParsedDocument | null;
  isUploading: boolean;
  setDocument: (doc: ParsedDocument | null) => void;
  setIsUploading: (value: boolean) => void;

  // Chunking state
  chunkingConfig: ChunkingConfig;
  chunks: Chunk[];
  isChunking: boolean;
  selectedChunkIndex: number | null;
  setChunkingConfig: (config: Partial<ChunkingConfig>) => void;
  setChunks: (chunks: Chunk[]) => void;
  setIsChunking: (value: boolean) => void;
  setSelectedChunkIndex: (index: number | null) => void;

  // Embedding state
  embeddingModel: string;
  embeddings: number[][] | null;
  isEmbedding: boolean;
  setEmbeddingModel: (model: string) => void;
  setEmbeddings: (embeddings: number[][] | null) => void;
  setIsEmbedding: (value: boolean) => void;

  // Visualization state
  reductionMethod: ReductionMethod;
  points2D: Point2D[] | null;
  points3D: Point3D[] | null;
  similarityMatrix: SimilarityMatrix | null;
  clusters: ClusterResult | null;
  hoveredPointIndex: number | null;
  setReductionMethod: (method: ReductionMethod) => void;
  setPoints2D: (points: Point2D[] | null) => void;
  setPoints3D: (points: Point3D[] | null) => void;
  setSimilarityMatrix: (matrix: SimilarityMatrix | null) => void;
  setClusters: (clusters: ClusterResult | null) => void;
  setHoveredPointIndex: (index: number | null) => void;

  // UI state
  activeTab: 'upload' | 'chunking' | 'embedding' | 'visualization' | 'export';
  error: string | null;
  setActiveTab: (tab: 'upload' | 'chunking' | 'embedding' | 'visualization' | 'export') => void;
  setError: (error: string | null) => void;

  // Reset functions
  resetAll: () => void;
  resetFromChunking: () => void;
  resetFromEmbedding: () => void;
}

const initialChunkingConfig: ChunkingConfig = {
  strategy: 'recursive',
  chunk_size: 512,
  chunk_overlap: 50,
  separators: ['\n\n', '\n', '. ', ' ', ''],
};

export const useStore = create<Store>()(
  devtools(
    (set) => ({
      // Document state
      document: null,
      isUploading: false,
      setDocument: (doc) => set({ document: doc }),
      setIsUploading: (value) => set({ isUploading: value }),

      // Chunking state
      chunkingConfig: initialChunkingConfig,
      chunks: [],
      isChunking: false,
      selectedChunkIndex: null,
      setChunkingConfig: (config) =>
        set((state) => ({
          chunkingConfig: { ...state.chunkingConfig, ...config },
        })),
      setChunks: (chunks) => set({ chunks }),
      setIsChunking: (value) => set({ isChunking: value }),
      setSelectedChunkIndex: (index) => set({ selectedChunkIndex: index }),

      // Embedding state
      embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
      embeddings: null,
      isEmbedding: false,
      setEmbeddingModel: (model) => set({ embeddingModel: model }),
      setEmbeddings: (embeddings) => set({ embeddings }),
      setIsEmbedding: (value) => set({ isEmbedding: value }),

      // Visualization state
      reductionMethod: 'umap',
      points2D: null,
      points3D: null,
      similarityMatrix: null,
      clusters: null,
      hoveredPointIndex: null,
      setReductionMethod: (method) => set({ reductionMethod: method }),
      setPoints2D: (points) => set({ points2D: points }),
      setPoints3D: (points) => set({ points3D: points }),
      setSimilarityMatrix: (matrix) => set({ similarityMatrix: matrix }),
      setClusters: (clusters) => set({ clusters }),
      setHoveredPointIndex: (index) => set({ hoveredPointIndex: index }),

      // UI state
      activeTab: 'upload',
      error: null,
      setActiveTab: (tab) => set({ activeTab: tab }),
      setError: (error) => set({ error }),

      // Reset functions
      resetAll: () =>
        set({
          document: null,
          chunks: [],
          embeddings: null,
          points2D: null,
          points3D: null,
          similarityMatrix: null,
          clusters: null,
          selectedChunkIndex: null,
          hoveredPointIndex: null,
          error: null,
          activeTab: 'upload',
        }),
      resetFromChunking: () =>
        set({
          chunks: [],
          embeddings: null,
          points2D: null,
          points3D: null,
          similarityMatrix: null,
          clusters: null,
          selectedChunkIndex: null,
          hoveredPointIndex: null,
        }),
      resetFromEmbedding: () =>
        set({
          embeddings: null,
          points2D: null,
          points3D: null,
          similarityMatrix: null,
          clusters: null,
          hoveredPointIndex: null,
        }),
    }),
    { name: 'vectorization-store' }
  )
);
