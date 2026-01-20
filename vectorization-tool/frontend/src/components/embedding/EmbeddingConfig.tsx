import { useEffect, useState } from 'react';
import { useStore } from '../../stores/useStore';
import { listEmbeddingModels } from '../../services/api';
import type { EmbeddingModel } from '../../types';
import { Info, Cpu, Zap, Award } from 'lucide-react';

const modelIcons: Record<string, React.ReactNode> = {
  'sentence-transformers/all-MiniLM-L6-v2': <Zap size={18} className="text-yellow-400" />,
  'sentence-transformers/all-mpnet-base-v2': <Award size={18} className="text-blue-400" />,
  'sentence-transformers/paraphrase-MiniLM-L6-v2': <Zap size={18} className="text-orange-400" />,
  'text-embedding-3-small': <Cpu size={18} className="text-green-400" />,
  'text-embedding-3-large': <Cpu size={18} className="text-purple-400" />,
};

export function EmbeddingConfig() {
  const { embeddingModel, setEmbeddingModel, resetFromEmbedding } = useStore();
  const [models, setModels] = useState<EmbeddingModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchModels() {
      try {
        const result = await listEmbeddingModels();
        setModels(result.models);
      } catch (err) {
        // Fallback to default models
        setModels([
          {
            id: 'all-MiniLM-L6-v2',
            name: 'MiniLM L6',
            dimensions: 384,
            max_tokens: 256,
            description: 'Fast and lightweight. Good for general use.',
          },
          {
            id: 'all-mpnet-base-v2',
            name: 'MPNet Base',
            dimensions: 768,
            max_tokens: 384,
            description: 'Higher quality embeddings. Slower but more accurate.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, []);

  const handleModelChange = (modelId: string) => {
    resetFromEmbedding();
    setEmbeddingModel(modelId);
  };

  const selectedModel = models.find((m) => m.id === embeddingModel);

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h3 className="font-medium text-white mb-4">Embedding Model</h3>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="p-4 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] animate-pulse h-24"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelChange(model.id)}
                className={`
                  p-4 rounded-lg border text-left transition-all
                  ${embeddingModel === model.id
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#1a1a1a]'
                  }
                `}
              >
                <div className="flex items-center gap-3 mb-2">
                  {modelIcons[model.id] || <Cpu size={18} className="text-[#a0a0a0]" />}
                  <span className="font-medium text-white">{model.name}</span>
                  {embeddingModel === model.id && (
                    <div className="w-2 h-2 rounded-full bg-primary-500 ml-auto" />
                  )}
                </div>
                <p className="text-xs text-[#a0a0a0] mb-2">{model.description}</p>
                <div className="flex gap-4 text-xs text-[#6a6a6a]">
                  <span>{model.dimensions}d</span>
                  <span>Max {model.max_tokens} tokens</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedModel && (
        <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-primary-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-[#a0a0a0]">
              <p className="mb-2">
                <strong className="text-white">{selectedModel.name}</strong> will create {selectedModel.dimensions}-dimensional vectors.
              </p>
              <ul className="space-y-1 text-xs">
                <li>• Higher dimensions capture more nuance but use more memory</li>
                <li>• Each chunk will be truncated to {selectedModel.max_tokens} tokens if needed</li>
                <li>• Local models run on your machine; OpenAI models require an API key</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
