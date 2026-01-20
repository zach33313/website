import { useMemo } from 'react';
import { useStore } from '../../stores/useStore';

// Generate distinct colors for chunks
function getChunkColor(index: number, total: number): string {
  const hue = (index / total) * 360;
  return `hsl(${hue}, 70%, 60%)`;
}

export function ChunkPreview() {
  const { document, chunks, selectedChunkIndex, setSelectedChunkIndex } = useStore();

  const highlightedContent = useMemo(() => {
    if (!document || chunks.length === 0) return null;

    const content = document.content;
    const segments: { text: string; chunkIndex: number | null; isOverlap: boolean }[] = [];

    let lastEnd = 0;

    // Sort chunks by start position
    const sortedChunks = [...chunks].sort(
      (a, b) => a.metadata.start_char - b.metadata.start_char
    );

    for (let i = 0; i < sortedChunks.length; i++) {
      const chunk = sortedChunks[i];
      const start = chunk.metadata.start_char;
      const end = chunk.metadata.end_char;

      // Check if there's overlap with previous chunk
      if (start < lastEnd && i > 0) {
        // Add non-overlapping part before this chunk
        if (start > sortedChunks[i - 1].metadata.start_char) {
          // Already handled
        }
        // Add overlap region
        segments.push({
          text: content.slice(start, Math.min(lastEnd, end)),
          chunkIndex: i,
          isOverlap: true,
        });
        // Add rest of current chunk
        if (end > lastEnd) {
          segments.push({
            text: content.slice(lastEnd, end),
            chunkIndex: i,
            isOverlap: false,
          });
        }
      } else {
        // No overlap - add gap if exists
        if (start > lastEnd) {
          segments.push({
            text: content.slice(lastEnd, start),
            chunkIndex: null,
            isOverlap: false,
          });
        }
        // Add chunk
        segments.push({
          text: content.slice(start, end),
          chunkIndex: i,
          isOverlap: false,
        });
      }

      lastEnd = Math.max(lastEnd, end);
    }

    // Add any remaining text
    if (lastEnd < content.length) {
      segments.push({
        text: content.slice(lastEnd),
        chunkIndex: null,
        isOverlap: false,
      });
    }

    return segments;
  }, [document, chunks]);

  if (!document) {
    return (
      <div className="card p-6 text-center text-[#a0a0a0]">
        Upload a document to see chunk preview
      </div>
    );
  }

  if (chunks.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="font-medium text-white mb-4">Document Preview</h3>
        <div className="bg-[#1a1a1a] rounded-lg p-4 max-h-96 overflow-y-auto">
          <pre className="text-sm text-[#a0a0a0] whitespace-pre-wrap font-mono">
            {document.content}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-white">Chunk Preview</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-primary-500/30" />
            Chunk boundary
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-yellow-500/30" />
            Overlap region
          </span>
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-lg p-4 max-h-96 overflow-y-auto">
        <div className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
          {highlightedContent?.map((segment, i) => {
            if (segment.chunkIndex === null) {
              return (
                <span key={i} className="text-[#6a6a6a]">
                  {segment.text}
                </span>
              );
            }

            const isSelected = selectedChunkIndex === segment.chunkIndex;
            const color = getChunkColor(segment.chunkIndex, chunks.length);

            return (
              <span
                key={i}
                onClick={() => setSelectedChunkIndex(
                  isSelected ? null : segment.chunkIndex
                )}
                className={`
                  cursor-pointer transition-all rounded px-0.5
                  ${segment.isOverlap ? 'bg-yellow-500/20 border-b-2 border-yellow-500/50' : ''}
                  ${isSelected ? 'ring-2 ring-primary-500' : ''}
                `}
                style={{
                  backgroundColor: segment.isOverlap
                    ? undefined
                    : isSelected
                      ? `${color}40`
                      : `${color}15`,
                  borderLeft: !segment.isOverlap ? `3px solid ${color}` : undefined,
                }}
                title={`Chunk ${segment.chunkIndex + 1}`}
              >
                {segment.text}
              </span>
            );
          })}
        </div>
      </div>

      {selectedChunkIndex !== null && (
        <div className="mt-4 p-4 bg-[#1a1a1a] rounded-lg border border-primary-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">
              Chunk {selectedChunkIndex + 1} of {chunks.length}
            </span>
            <button
              onClick={() => setSelectedChunkIndex(null)}
              className="text-xs text-[#a0a0a0] hover:text-white"
            >
              Clear selection
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[#6a6a6a]">Characters</span>
              <p className="text-white">{chunks[selectedChunkIndex].metadata.char_count}</p>
            </div>
            <div>
              <span className="text-[#6a6a6a]">Words</span>
              <p className="text-white">{chunks[selectedChunkIndex].metadata.word_count}</p>
            </div>
            <div>
              <span className="text-[#6a6a6a]">Start</span>
              <p className="text-white">{chunks[selectedChunkIndex].metadata.start_char}</p>
            </div>
            <div>
              <span className="text-[#6a6a6a]">End</span>
              <p className="text-white">{chunks[selectedChunkIndex].metadata.end_char}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
