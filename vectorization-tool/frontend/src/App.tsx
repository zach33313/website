import { useStore } from './stores/useStore';
import { TabNav } from './components/common/TabNav';
import { ErrorBanner } from './components/common/ErrorBanner';
import { UploadPanel } from './components/upload/UploadPanel';
import { ChunkingPanel } from './components/chunking/ChunkingPanel';
import { EmbeddingPanel } from './components/embedding/EmbeddingPanel';
import { VisualizationPanel } from './components/visualization/VisualizationPanel';
import { ExportPanel } from './components/export/ExportPanel';
import { Sparkles, Github, RotateCcw } from 'lucide-react';

function App() {
  const { activeTab, resetAll } = useStore();

  const renderPanel = () => {
    switch (activeTab) {
      case 'upload':
        return <UploadPanel />;
      case 'chunking':
        return <ChunkingPanel />;
      case 'embedding':
        return <EmbeddingPanel />;
      case 'visualization':
        return <VisualizationPanel />;
      case 'export':
        return <ExportPanel />;
      default:
        return <UploadPanel />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/10 rounded-lg">
                <Sparkles className="text-primary-400" size={24} />
              </div>
              <div>
                <h1 className="font-semibold text-white">Vectorization Insight Tool</h1>
                <p className="text-xs text-[#6a6a6a]">Visualize how your text becomes vectors</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={resetAll}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#a0a0a0] hover:text-white transition-colors"
                title="Reset all data"
              >
                <RotateCcw size={16} />
                <span className="hidden sm:inline">Reset</span>
              </button>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-[#6a6a6a] hover:text-white transition-colors"
                title="View on GitHub"
              >
                <Github size={20} />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="border-b border-[#2a2a2a] bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <TabNav />
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBanner />
        <div className="mt-4">
          {renderPanel()}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a2a2a] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#6a6a6a]">
            <p>
              Built for understanding the vectorization process
            </p>
            <div className="flex items-center gap-6">
              <a
                href="https://huggingface.co/sentence-transformers"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#a0a0a0] transition-colors"
              >
                Sentence Transformers
              </a>
              <a
                href="https://umap-learn.readthedocs.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#a0a0a0] transition-colors"
              >
                UMAP
              </a>
              <a
                href="https://docs.trychroma.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#a0a0a0] transition-colors"
              >
                ChromaDB
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
