import { FileText, Search } from 'lucide-react';
import type { Chunk } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface ChunksPanelProps {
  chunks: Chunk[];
  loading: boolean;
  hasChunks: boolean;
  onProcess: () => void;
}

export function ChunksPanel({ chunks, loading, hasChunks, onProcess }: ChunksPanelProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!hasChunks && chunks.length === 0) {
    return (
      <div className="text-center py-12">
        <Search size={48} className="mx-auto text-[#4a4a4a] mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">
          No relevant materials found
        </h3>
        <p className="text-[#6a6a6a] mb-4">
          Search your vectorized course materials for relevant content
        </p>
        <button
          onClick={onProcess}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Find Relevant Materials
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-white">
          {chunks.length} Relevant Chunks
        </h3>
        <button
          onClick={onProcess}
          className="text-sm text-primary-400 hover:text-primary-300"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {chunks.map((chunk) => (
          <div
            key={chunk.chunk_id}
            className="p-4 bg-[#141414] rounded-lg border border-[#2a2a2a]"
          >
            <div className="flex items-start gap-3">
              <FileText size={16} className="text-primary-400 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-white truncate">
                    {chunk.filename}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded">
                    {(chunk.relevance_score * 100).toFixed(0)}% match
                  </span>
                </div>
                <p className="text-sm text-[#a0a0a0] whitespace-pre-wrap line-clamp-4">
                  {chunk.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
