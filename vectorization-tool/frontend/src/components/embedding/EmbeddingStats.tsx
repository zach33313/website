import { useStore } from '../../stores/useStore';
import { StatsCard } from '../common/StatsCard';
import { Box, Hash, Clock } from 'lucide-react';

interface EmbeddingStatsProps {
  processingTime?: number;
}

export function EmbeddingStats({ processingTime }: EmbeddingStatsProps) {
  const { embeddings, chunks } = useStore();

  if (!embeddings) return null;

  const dimensions = embeddings[0]?.length || 0;
  const totalValues = embeddings.length * dimensions;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatsCard
        label="Vectors"
        value={embeddings.length}
        subtext={`${chunks.length} chunks embedded`}
        icon={<Box size={20} />}
      />
      <StatsCard
        label="Dimensions"
        value={dimensions}
        subtext="per vector"
        icon={<Hash size={20} />}
      />
      <StatsCard
        label="Total Values"
        value={totalValues.toLocaleString()}
        subtext="floating point numbers"
      />
      {processingTime !== undefined && (
        <StatsCard
          label="Processing Time"
          value={`${(processingTime / 1000).toFixed(2)}s`}
          icon={<Clock size={20} />}
        />
      )}
    </div>
  );
}
