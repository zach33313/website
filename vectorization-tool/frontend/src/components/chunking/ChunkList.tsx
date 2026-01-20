import { useStore } from '../../stores/useStore';

function getChunkColor(index: number, total: number): string {
  const hue = (index / total) * 360;
  return `hsl(${hue}, 70%, 60%)`;
}

export function ChunkList() {
  const { chunks, selectedChunkIndex, setSelectedChunkIndex } = useStore();

  if (chunks.length === 0) {
    return null;
  }

  return (
    <div className="card p-6">
      <h3 className="font-medium text-white mb-4">
        Chunks ({chunks.length})
      </h3>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {chunks.map((chunk, index) => {
          const isSelected = selectedChunkIndex === index;
          const color = getChunkColor(index, chunks.length);

          return (
            <button
              key={chunk.id}
              onClick={() => setSelectedChunkIndex(isSelected ? null : index)}
              className={`
                w-full text-left p-3 rounded-lg border transition-all
                ${isSelected
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#3a3a3a]'
                }
              `}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-1.5 h-6 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-medium text-white">
                  Chunk {index + 1}
                </span>
                <span className="text-xs text-[#6a6a6a] ml-auto">
                  {chunk.metadata.char_count} chars
                </span>
              </div>
              <p className="text-xs text-[#a0a0a0] line-clamp-2 ml-4">
                {chunk.content}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
