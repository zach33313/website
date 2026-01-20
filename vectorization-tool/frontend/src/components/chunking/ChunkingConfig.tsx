import { useStore } from '../../stores/useStore';
import type { ChunkingStrategy } from '../../types';
import { Info } from 'lucide-react';

const strategyDescriptions: Record<ChunkingStrategy, string> = {
  recursive: 'Recursively splits text using a hierarchy of separators (paragraphs → sentences → words). Best for general text.',
  fixed: 'Splits text into fixed-size chunks regardless of content boundaries. Simple but may break mid-sentence.',
  sentence: 'Splits text at sentence boundaries. Preserves semantic meaning but chunk sizes vary.',
  paragraph: 'Splits text at paragraph boundaries (double newlines). Good for structured documents.',
  semantic: 'Uses AI embeddings to detect topic shifts and create semantically coherent chunks. Best quality but slower.',
};

const defaultSeparators: Record<ChunkingStrategy, string[]> = {
  recursive: ['\\n\\n', '\\n', '. ', ' ', ''],
  fixed: [],
  sentence: ['. ', '! ', '? ', '\\n'],
  paragraph: ['\\n\\n', '\\n'],
  semantic: [],
};

export function ChunkingConfig() {
  const { chunkingConfig, setChunkingConfig, resetFromChunking } = useStore();

  const handleStrategyChange = (strategy: ChunkingStrategy) => {
    resetFromChunking();
    setChunkingConfig({
      strategy,
      separators: defaultSeparators[strategy],
    });
  };

  const handleSizeChange = (value: number) => {
    resetFromChunking();
    setChunkingConfig({ chunk_size: value });
  };

  const handleOverlapChange = (value: number) => {
    resetFromChunking();
    setChunkingConfig({ chunk_overlap: value });
  };

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h3 className="font-medium text-white mb-4">Chunking Strategy</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.keys(strategyDescriptions) as ChunkingStrategy[]).map((strategy) => (
            <button
              key={strategy}
              onClick={() => handleStrategyChange(strategy)}
              className={`
                p-4 rounded-lg border text-left transition-all
                ${chunkingConfig.strategy === strategy
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#1a1a1a]'
                }
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white capitalize">{strategy}</span>
                {chunkingConfig.strategy === strategy && (
                  <div className="w-2 h-2 rounded-full bg-primary-500" />
                )}
              </div>
              <p className="text-xs text-[#a0a0a0] line-clamp-2">
                {strategyDescriptions[strategy]}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="label flex items-center gap-2">
            Chunk Size (characters)
            <div className="group relative">
              <Info size={14} className="text-[#6a6a6a]" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-xs text-[#a0a0a0] w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Target size for each chunk. Actual sizes may vary based on strategy.
              </div>
            </div>
          </label>
          <input
            type="range"
            min="100"
            max="2000"
            step="50"
            value={chunkingConfig.chunk_size}
            onChange={(e) => handleSizeChange(Number(e.target.value))}
            className="w-full accent-primary-500"
          />
          <div className="flex justify-between text-xs text-[#6a6a6a] mt-1">
            <span>100</span>
            <span className="text-primary-400 font-medium">{chunkingConfig.chunk_size}</span>
            <span>2000</span>
          </div>
        </div>

        <div>
          <label className="label flex items-center gap-2">
            Chunk Overlap (characters)
            <div className="group relative">
              <Info size={14} className="text-[#6a6a6a]" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-xs text-[#a0a0a0] w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Amount of overlap between consecutive chunks. Helps maintain context.
              </div>
            </div>
          </label>
          <input
            type="range"
            min="0"
            max="500"
            step="10"
            value={chunkingConfig.chunk_overlap}
            onChange={(e) => handleOverlapChange(Number(e.target.value))}
            className="w-full accent-primary-500"
          />
          <div className="flex justify-between text-xs text-[#6a6a6a] mt-1">
            <span>0</span>
            <span className="text-primary-400 font-medium">{chunkingConfig.chunk_overlap}</span>
            <span>500</span>
          </div>
        </div>
      </div>

      {(chunkingConfig.strategy === 'recursive' || chunkingConfig.strategy === 'sentence' || chunkingConfig.strategy === 'paragraph') && (
        <div>
          <label className="label">Separators (in order of priority)</label>
          <div className="flex flex-wrap gap-2">
            {chunkingConfig.separators?.map((sep, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full text-sm font-mono text-[#a0a0a0]"
              >
                {sep === '\\n\\n' ? '¶¶' : sep === '\\n' ? '¶' : sep === '' ? '∅' : `"${sep}"`}
              </span>
            ))}
          </div>
          <p className="text-xs text-[#6a6a6a] mt-2">
            ¶ = newline, ¶¶ = paragraph break, ∅ = character-level split
          </p>
        </div>
      )}
    </div>
  );
}
