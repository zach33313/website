import { useCallback, useState } from 'react';
import { useStore } from '../../stores/useStore';
import { chunkText } from '../../services/api';
import { ChunkingConfig } from './ChunkingConfig';
import { ChunkPreview } from './ChunkPreview';
import { ChunkList } from './ChunkList';
import { StatsCard } from '../common/StatsCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Scissors, ArrowRight, BarChart2, Layers } from 'lucide-react';

export function ChunkingPanel() {
  const {
    document,
    chunkingConfig,
    chunks,
    isChunking,
    setChunks,
    setIsChunking,
    setError,
    setActiveTab,
  } = useStore();

  const [stats, setStats] = useState<{
    avg: number;
    min: number;
    max: number;
  } | null>(null);

  const handleChunk = useCallback(async () => {
    if (!document) return;

    setIsChunking(true);
    setError(null);

    try {
      const result = await chunkText(document.content, chunkingConfig);
      setChunks(result.chunks);
      setStats({
        avg: Math.round(result.stats.avg_chunk_size),
        min: result.stats.min_chunk_size,
        max: result.stats.max_chunk_size,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chunking failed');
    } finally {
      setIsChunking(false);
    }
  }, [document, chunkingConfig, setChunks, setIsChunking, setError]);

  if (!document) {
    return (
      <div className="card p-12 text-center">
        <p className="text-[#a0a0a0]">Please upload a document first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Configure Chunking</h2>
        <p className="text-[#a0a0a0]">
          Choose how to split your document into chunks. Different strategies work better for different types of content.
        </p>
      </div>

      <ChunkingConfig />

      <div className="flex justify-center">
        <button
          onClick={handleChunk}
          disabled={isChunking}
          className="btn-primary flex items-center gap-2 px-8"
        >
          {isChunking ? (
            <>
              <LoadingSpinner size="sm" />
              Processing...
            </>
          ) : (
            <>
              <Scissors size={18} />
              {chunks.length > 0 ? 'Re-chunk Document' : 'Chunk Document'}
            </>
          )}
        </button>
      </div>

      {chunks.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatsCard
              label="Total Chunks"
              value={chunks.length}
              icon={<Layers size={20} />}
            />
            <StatsCard
              label="Avg Size"
              value={stats?.avg || 0}
              subtext="characters"
              icon={<BarChart2 size={20} />}
            />
            <StatsCard
              label="Min Size"
              value={stats?.min || 0}
              subtext="characters"
            />
            <StatsCard
              label="Max Size"
              value={stats?.max || 0}
              subtext="characters"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChunkPreview />
            </div>
            <div>
              <ChunkList />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setActiveTab('embedding')}
              className="btn-primary flex items-center gap-2"
            >
              Continue to Embedding
              <ArrowRight size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
