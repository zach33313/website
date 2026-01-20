import { useCallback, useState } from 'react';
import { useStore } from '../../stores/useStore';
import { generateEmbeddings } from '../../services/api';
import { EmbeddingConfig } from './EmbeddingConfig';
import { EmbeddingStats } from './EmbeddingStats';
import { VectorPreview } from './VectorPreview';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Box, ArrowRight } from 'lucide-react';

export function EmbeddingPanel() {
  const {
    chunks,
    embeddingModel,
    embeddings,
    isEmbedding,
    setEmbeddings,
    setIsEmbedding,
    setError,
    setActiveTab,
  } = useStore();

  const [processingTime, setProcessingTime] = useState<number | undefined>();

  const handleEmbed = useCallback(async () => {
    if (chunks.length === 0) return;

    setIsEmbedding(true);
    setError(null);

    const startTime = Date.now();

    try {
      const texts = chunks.map((c) => c.content);
      const result = await generateEmbeddings(texts, embeddingModel);
      setEmbeddings(result.embeddings);
      setProcessingTime(Date.now() - startTime);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Embedding failed');
    } finally {
      setIsEmbedding(false);
    }
  }, [chunks, embeddingModel, setEmbeddings, setIsEmbedding, setError]);

  if (chunks.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-[#a0a0a0]">Please chunk your document first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Generate Embeddings</h2>
        <p className="text-[#a0a0a0]">
          Convert your {chunks.length} chunks into vector embeddings. Choose a model based on your quality/speed needs.
        </p>
      </div>

      <EmbeddingConfig />

      <div className="flex justify-center">
        <button
          onClick={handleEmbed}
          disabled={isEmbedding}
          className="btn-primary flex items-center gap-2 px-8"
        >
          {isEmbedding ? (
            <>
              <LoadingSpinner size="sm" />
              Generating embeddings...
            </>
          ) : (
            <>
              <Box size={18} />
              {embeddings ? 'Re-generate Embeddings' : 'Generate Embeddings'}
            </>
          )}
        </button>
      </div>

      {embeddings && (
        <>
          <EmbeddingStats processingTime={processingTime} />
          <VectorPreview />

          <div className="flex justify-end">
            <button
              onClick={() => setActiveTab('visualization')}
              className="btn-primary flex items-center gap-2"
            >
              Visualize Embeddings
              <ArrowRight size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
