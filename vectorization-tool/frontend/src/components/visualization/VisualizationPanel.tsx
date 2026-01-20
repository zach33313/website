import { useCallback, useState } from 'react';
import { useStore } from '../../stores/useStore';
import {
  reduceDimensions,
  computeSimilarityMatrix,
  clusterEmbeddings,
} from '../../services/api';
import { ScatterPlot } from './ScatterPlot';
import { SimilarityHeatmap } from './SimilarityHeatmap';
import { NeighborList } from './NeighborList';
import { LoadingSpinner } from '../common/LoadingSpinner';
import type { ReductionMethod, Point2D, Point3D } from '../../types';
import {
  BarChart3,
  Grid3X3,
  Box,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

type ViewMode = 'scatter2d' | 'scatter3d' | 'heatmap';

const reductionMethods: { id: ReductionMethod; name: string; description: string }[] = [
  {
    id: 'umap',
    name: 'UMAP',
    description: 'Best for preserving local and global structure',
  },
  {
    id: 'tsne',
    name: 't-SNE',
    description: 'Great for visualizing clusters',
  },
  {
    id: 'pca',
    name: 'PCA',
    description: 'Fast linear reduction',
  },
];

export function VisualizationPanel() {
  const {
    embeddings,
    chunks,
    reductionMethod,
    setReductionMethod,
    points2D,
    points3D,
    setPoints2D,
    setPoints3D,
    similarityMatrix,
    setSimilarityMatrix,
    clusters,
    setClusters,
    setError,
  } = useStore();

  const [viewMode, setViewMode] = useState<ViewMode>('scatter2d');
  const [isReducing, setIsReducing] = useState(false);
  const [isComputingSimilarity, setIsComputingSimilarity] = useState(false);
  const [isClustering, setIsClustering] = useState(false);
  const [numClusters, setNumClusters] = useState(5);

  const handleReduce = useCallback(
    async (method: ReductionMethod, dimensions: 2 | 3) => {
      if (!embeddings) return;

      setIsReducing(true);
      setError(null);

      try {
        const previews = chunks.map((c) => c.content.slice(0, 100));
        const result = await reduceDimensions(
          embeddings,
          method,
          dimensions,
          previews
        );

        if (dimensions === 2) {
          setPoints2D(result.points as Point2D[]);
        } else {
          setPoints3D(result.points as Point3D[]);
        }
        setReductionMethod(method);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Reduction failed');
      } finally {
        setIsReducing(false);
      }
    },
    [embeddings, chunks, setPoints2D, setPoints3D, setReductionMethod, setError]
  );

  const handleComputeSimilarity = useCallback(async () => {
    if (!embeddings) return;

    setIsComputingSimilarity(true);
    setError(null);

    try {
      const chunkIds = chunks.map((c) => c.id);
      const result = await computeSimilarityMatrix(embeddings, chunkIds);
      setSimilarityMatrix(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Similarity computation failed');
    } finally {
      setIsComputingSimilarity(false);
    }
  }, [embeddings, chunks, setSimilarityMatrix, setError]);

  const handleCluster = useCallback(async () => {
    if (!embeddings) return;

    setIsClustering(true);
    setError(null);

    try {
      const chunkIds = chunks.map((c) => c.id);
      const result = await clusterEmbeddings(embeddings, numClusters, chunkIds);
      setClusters(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clustering failed');
    } finally {
      setIsClustering(false);
    }
  }, [embeddings, chunks, numClusters, setClusters, setError]);

  if (!embeddings) {
    return (
      <div className="card p-12 text-center">
        <p className="text-[#a0a0a0]">Generate embeddings first to visualize them</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Visualize Embeddings</h2>
        <p className="text-[#a0a0a0]">
          Explore your {embeddings.length} vectors through dimensionality reduction, similarity analysis, and clustering.
        </p>
      </div>

      {/* View mode tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('scatter2d')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'scatter2d'
              ? 'bg-primary-500 text-white'
              : 'bg-[#1a1a1a] text-[#a0a0a0] hover:text-white'
          }`}
        >
          <BarChart3 size={18} />
          2D Scatter
        </button>
        <button
          onClick={() => setViewMode('scatter3d')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'scatter3d'
              ? 'bg-primary-500 text-white'
              : 'bg-[#1a1a1a] text-[#a0a0a0] hover:text-white'
          }`}
        >
          <Box size={18} />
          3D Scatter
        </button>
        <button
          onClick={() => setViewMode('heatmap')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'heatmap'
              ? 'bg-primary-500 text-white'
              : 'bg-[#1a1a1a] text-[#a0a0a0] hover:text-white'
          }`}
        >
          <Grid3X3 size={18} />
          Similarity Heatmap
        </button>
      </div>

      {/* Controls based on view mode */}
      {(viewMode === 'scatter2d' || viewMode === 'scatter3d') && (
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#a0a0a0]">Method:</span>
              {reductionMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() =>
                    handleReduce(method.id, viewMode === 'scatter3d' ? 3 : 2)
                  }
                  disabled={isReducing}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    reductionMethod === method.id
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/50'
                      : 'bg-[#1a1a1a] text-[#a0a0a0] hover:text-white border border-[#2a2a2a]'
                  }`}
                  title={method.description}
                >
                  {method.name}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-[#2a2a2a]" />

            <div className="flex items-center gap-2">
              <span className="text-sm text-[#a0a0a0]">Clusters:</span>
              <input
                type="number"
                min={2}
                max={20}
                value={numClusters}
                onChange={(e) => setNumClusters(Number(e.target.value))}
                className="input-field w-16 text-sm py-1"
              />
              <button
                onClick={handleCluster}
                disabled={isClustering}
                className="btn-secondary text-sm py-1.5 flex items-center gap-2"
              >
                {isClustering ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Layers size={16} />
                )}
                Apply
              </button>
              {clusters && (
                <button
                  onClick={() => setClusters(null)}
                  className="text-xs text-[#6a6a6a] hover:text-[#a0a0a0]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'heatmap' && !similarityMatrix && (
        <div className="flex justify-center">
          <button
            onClick={handleComputeSimilarity}
            disabled={isComputingSimilarity}
            className="btn-primary flex items-center gap-2"
          >
            {isComputingSimilarity ? (
              <>
                <LoadingSpinner size="sm" />
                Computing...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Compute Similarity Matrix
              </>
            )}
          </button>
        </div>
      )}

      {/* Main visualization area */}
      {isReducing ? (
        <div className="card p-12 flex items-center justify-center">
          <LoadingSpinner text="Reducing dimensions..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {viewMode === 'scatter2d' && <ScatterPlot is3D={false} />}
            {viewMode === 'scatter3d' && <ScatterPlot is3D={true} />}
            {viewMode === 'heatmap' && <SimilarityHeatmap />}
          </div>
          <div>
            <NeighborList />
          </div>
        </div>
      )}

      {/* Quick actions */}
      {(viewMode === 'scatter2d' || viewMode === 'scatter3d') &&
        !points2D &&
        !points3D && (
          <div className="flex justify-center">
            <button
              onClick={() =>
                handleReduce('umap', viewMode === 'scatter3d' ? 3 : 2)
              }
              disabled={isReducing}
              className="btn-primary flex items-center gap-2"
            >
              <Sparkles size={18} />
              Generate {viewMode === 'scatter3d' ? '3D' : '2D'} Visualization
            </button>
          </div>
        )}

      <div className="flex justify-end">
        <button
          onClick={() => useStore.getState().setActiveTab('export')}
          className="btn-primary flex items-center gap-2"
        >
          Export Data
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
