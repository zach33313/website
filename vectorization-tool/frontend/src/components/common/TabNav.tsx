import { useStore } from '../../stores/useStore';
import {
  Upload,
  Scissors,
  Box,
  BarChart3,
  Download,
  Check,
} from 'lucide-react';

type Tab = 'upload' | 'chunking' | 'embedding' | 'visualization' | 'export';

interface TabConfig {
  id: Tab;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabConfig[] = [
  { id: 'upload', label: 'Upload', icon: <Upload size={18} /> },
  { id: 'chunking', label: 'Chunking', icon: <Scissors size={18} /> },
  { id: 'embedding', label: 'Embedding', icon: <Box size={18} /> },
  { id: 'visualization', label: 'Visualize', icon: <BarChart3 size={18} /> },
  { id: 'export', label: 'Export', icon: <Download size={18} /> },
];

export function TabNav() {
  const { activeTab, setActiveTab, document, chunks, embeddings } = useStore();

  const isTabEnabled = (tab: Tab): boolean => {
    switch (tab) {
      case 'upload':
        return true;
      case 'chunking':
        return document !== null;
      case 'embedding':
        return chunks.length > 0;
      case 'visualization':
        return embeddings !== null;
      case 'export':
        return embeddings !== null;
      default:
        return false;
    }
  };

  const isTabComplete = (tab: Tab): boolean => {
    switch (tab) {
      case 'upload':
        return document !== null;
      case 'chunking':
        return chunks.length > 0;
      case 'embedding':
        return embeddings !== null;
      case 'visualization':
        return false; // Visualization is exploratory
      case 'export':
        return false;
      default:
        return false;
    }
  };

  return (
    <nav className="flex gap-1 p-1 bg-[#141414] rounded-lg border border-[#2a2a2a]">
      {tabs.map((tab) => {
        const enabled = isTabEnabled(tab.id);
        const complete = isTabComplete(tab.id);
        const active = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => enabled && setActiveTab(tab.id)}
            disabled={!enabled}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${active
                ? 'bg-primary-500 text-white'
                : enabled
                  ? 'text-[#a0a0a0] hover:text-white hover:bg-[#2a2a2a]'
                  : 'text-[#4a4a4a] cursor-not-allowed'
              }
            `}
          >
            {complete && !active ? (
              <Check size={18} className="text-primary-400" />
            ) : (
              tab.icon
            )}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
