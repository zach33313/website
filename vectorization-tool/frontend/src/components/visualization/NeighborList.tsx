import { useEffect, useState } from 'react';
import { useStore } from '../../stores/useStore';
import { findNearestNeighbors } from '../../services/api';
import type { NearestNeighbor } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Users } from 'lucide-react';

export function NeighborList() {
  const { embeddings, chunks, selectedChunkIndex, setSelectedChunkIndex } = useStore();
  const [neighbors, setNeighbors] = useState<NearestNeighbor[]>([]);
  const [loading, setLoading] = useState(false);
  const [k, setK] = useState(5);

  useEffect(() => {
    async function fetchNeighbors() {
      // More robust null/undefined check
      if (!embeddings || selectedChunkIndex === null || selectedChunkIndex === undefined || selectedChunkIndex < 0) {
        setNeighbors([]);
        return;
      }

      // Ensure index is within bounds
      if (selectedChunkIndex >= embeddings.length) {
        setNeighbors([]);
        return;
      }

      setLoading(true);
      try {
        const previews = chunks.map((c) => c.content?.slice(0, 100) || '');
        const result = await findNearestNeighbors(
          embeddings,
          selectedChunkIndex,
          k,
          previews
        );
        setNeighbors(result.neighbors || []);
      } catch (err) {
        console.error('Failed to fetch neighbors:', err);
        setNeighbors([]);
      } finally {
        setLoading(false);
      }
    }

    fetchNeighbors();
  }, [embeddings, selectedChunkIndex, k, chunks]);

  if (selectedChunkIndex === null) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="text-[#4a4a4a]" size={20} />
          <h3 className="font-medium text-white">Chunks</h3>
        </div>
        <p className="text-[#6a6a6a] text-xs mb-4">
          Click a chunk to see its nearest neighbors
        </p>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {chunks.map((chunk, i) => (
            <button
              key={chunk.id || `chunk-${i}`}
              onClick={() => setSelectedChunkIndex(i)}
              className="w-full text-left p-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-white">
                  Chunk {i + 1}
                </span>
              </div>
              <p className="text-xs text-[#a0a0a0] line-clamp-2">
                {chunk.content?.slice(0, 100) || ''}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-white">
          Nearest Neighbors
        </h3>
        <select
          value={k}
          onChange={(e) => setK(Number(e.target.value))}
          className="select-field text-sm py-1"
        >
          <option value={3}>Top 3</option>
          <option value={5}>Top 5</option>
          <option value={10}>Top 10</option>
        </select>
      </div>

      <div className="mb-4 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-primary-500" />
          <span className="text-sm font-medium text-white">
            Chunk {selectedChunkIndex + 1}
          </span>
          <span className="text-xs text-[#a0a0a0] ml-auto">Query</span>
        </div>
        <p className="text-xs text-[#a0a0a0] line-clamp-2">
          {chunks[selectedChunkIndex]?.content}
        </p>
      </div>

      {loading ? (
        <div className="py-8">
          <LoadingSpinner size="sm" text="Finding neighbors..." />
        </div>
      ) : neighbors.length > 0 ? (
        <div className="space-y-2">
          {neighbors.map((neighbor, i) => (
            <button
              key={neighbor.chunk_id}
              onClick={() => setSelectedChunkIndex(neighbor.chunk_index)}
              className="w-full text-left p-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs text-[#6a6a6a] font-mono w-4">
                  #{i + 1}
                </span>
                <span className="text-sm font-medium text-white">
                  Chunk {neighbor.chunk_index + 1}
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="w-16 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500"
                      style={{ width: `${neighbor.similarity * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-primary-400 font-mono">
                    {(neighbor.similarity * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#a0a0a0] line-clamp-2 ml-7">
                {neighbor.preview}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#6a6a6a] text-center py-4">
          No neighbors found
        </p>
      )}
    </div>
  );
}
