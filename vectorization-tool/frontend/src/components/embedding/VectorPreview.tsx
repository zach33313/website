import { useState } from 'react';
import { useStore } from '../../stores/useStore';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function VectorPreview() {
  const { embeddings, chunks, selectedChunkIndex, setSelectedChunkIndex } = useStore();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!embeddings || embeddings.length === 0) return null;

  const displayEmbeddings = selectedChunkIndex !== null
    ? [{ index: selectedChunkIndex, vector: embeddings[selectedChunkIndex] }]
    : embeddings.slice(0, 5).map((vector, index) => ({ index, vector }));

  return (
    <div className="card p-6">
      <h3 className="font-medium text-white mb-4">
        Vector Preview
        {selectedChunkIndex !== null && (
          <span className="text-[#a0a0a0] font-normal ml-2">
            (Chunk {selectedChunkIndex + 1})
          </span>
        )}
      </h3>

      <div className="space-y-2">
        {displayEmbeddings.map(({ index, vector }) => {
          const isExpanded = expandedIndex === index;
          const preview = vector.slice(0, 8);
          const chunk = chunks[index];

          return (
            <div
              key={index}
              className={`
                rounded-lg border transition-all
                ${selectedChunkIndex === index
                  ? 'border-primary-500 bg-primary-500/5'
                  : 'border-[#2a2a2a] bg-[#1a1a1a]'
                }
              `}
            >
              <button
                onClick={() => {
                  setExpandedIndex(isExpanded ? null : index);
                  setSelectedChunkIndex(index);
                }}
                className="w-full p-3 flex items-center gap-3 text-left"
              >
                {isExpanded ? (
                  <ChevronDown size={16} className="text-[#6a6a6a]" />
                ) : (
                  <ChevronRight size={16} className="text-[#6a6a6a]" />
                )}
                <span className="text-sm font-medium text-white">
                  Vector {index + 1}
                </span>
                <span className="text-xs text-[#6a6a6a] ml-auto">
                  [{vector.length} dimensions]
                </span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-3">
                  {/* Chunk content preview */}
                  <div className="p-2 bg-[#0a0a0a] rounded text-xs text-[#a0a0a0] line-clamp-2">
                    {chunk?.content || 'No content available'}
                  </div>

                  {/* Vector values */}
                  <div className="font-mono text-xs">
                    <div className="text-[#6a6a6a] mb-1">First 8 values:</div>
                    <div className="flex flex-wrap gap-1">
                      {preview.map((val, i) => (
                        <span
                          key={i}
                          className={`
                            px-2 py-1 rounded
                            ${val >= 0 ? 'bg-primary-500/20 text-primary-300' : 'bg-red-500/20 text-red-300'}
                          `}
                        >
                          {val.toFixed(4)}
                        </span>
                      ))}
                      <span className="px-2 py-1 text-[#6a6a6a]">
                        ...{vector.length - 8} more
                      </span>
                    </div>
                  </div>

                  {/* Vector statistics */}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-[#0a0a0a] rounded">
                      <span className="text-[#6a6a6a]">Min</span>
                      <p className="text-white">{Math.min(...vector).toFixed(4)}</p>
                    </div>
                    <div className="p-2 bg-[#0a0a0a] rounded">
                      <span className="text-[#6a6a6a]">Max</span>
                      <p className="text-white">{Math.max(...vector).toFixed(4)}</p>
                    </div>
                    <div className="p-2 bg-[#0a0a0a] rounded">
                      <span className="text-[#6a6a6a]">Mean</span>
                      <p className="text-white">
                        {(vector.reduce((a, b) => a + b, 0) / vector.length).toFixed(4)}
                      </p>
                    </div>
                    <div className="p-2 bg-[#0a0a0a] rounded">
                      <span className="text-[#6a6a6a]">Magnitude</span>
                      <p className="text-white">
                        {Math.sqrt(vector.reduce((a, b) => a + b * b, 0)).toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedChunkIndex === null && embeddings.length > 5 && (
        <p className="text-xs text-[#6a6a6a] mt-4 text-center">
          Showing first 5 of {embeddings.length} vectors. Select a chunk to view specific vector.
        </p>
      )}
    </div>
  );
}
