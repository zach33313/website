import { useState, useCallback } from 'react';
import { useStore } from '../../stores/useStore';
import { downloadExport, exportData } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import type { ExportFormat } from '../../types';
import {
  Download,
  Database,
  FileJson,
  FileSpreadsheet,
  CheckCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface ExportOption {
  id: ExportFormat;
  name: string;
  description: string;
  icon: React.ReactNode;
  requiresConfig?: boolean;
}

const exportOptions: ExportOption[] = [
  {
    id: 'json',
    name: 'JSON',
    description: 'Download as a JSON file with chunks and embeddings',
    icon: <FileJson size={24} />,
  },
  {
    id: 'csv',
    name: 'CSV',
    description: 'Download as CSV for spreadsheet analysis',
    icon: <FileSpreadsheet size={24} />,
  },
  {
    id: 'chromadb',
    name: 'ChromaDB',
    description: 'Get Python code to import into ChromaDB',
    icon: <Database size={24} />,
    requiresConfig: true,
  },
  {
    id: 'pinecone',
    name: 'Pinecone',
    description: 'Get Python code to upsert to Pinecone',
    icon: <Database size={24} />,
    requiresConfig: true,
  },
  {
    id: 'qdrant',
    name: 'Qdrant',
    description: 'Get Python code to upload to Qdrant',
    icon: <Database size={24} />,
    requiresConfig: true,
  },
];

export function ExportPanel() {
  const { chunks, embeddings } = useStore();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [collectionName, setCollectionName] = useState('my_collection');
  const [isExporting, setIsExporting] = useState(false);
  const [exportedCode, setExportedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExport = useCallback(async () => {
    if (!selectedFormat || !embeddings || chunks.length === 0) return;

    setIsExporting(true);
    setExportedCode(null);

    try {
      const exportChunks = chunks.map((c) => ({
        id: c.id,
        content: c.content,
        metadata: c.metadata as Record<string, unknown>,
      }));

      if (selectedFormat === 'json' || selectedFormat === 'csv') {
        await downloadExport(
          exportChunks,
          embeddings,
          selectedFormat,
          `vectors.${selectedFormat}`
        );
      } else {
        const result = await exportData(
          exportChunks,
          embeddings,
          selectedFormat,
          collectionName
        );
        const data = result.data as { code: string };
        setExportedCode(data.code);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat, chunks, embeddings, collectionName]);

  const handleCopy = useCallback(() => {
    if (exportedCode) {
      navigator.clipboard.writeText(exportedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [exportedCode]);

  if (!embeddings || chunks.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-[#a0a0a0]">Generate embeddings first to export them</p>
      </div>
    );
  }

  const selectedOption = exportOptions.find((o) => o.id === selectedFormat);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Export Data</h2>
        <p className="text-[#a0a0a0]">
          Export your {chunks.length} chunks and embeddings to various formats for use in your applications.
        </p>
      </div>

      {/* Export format selection */}
      <div className="card p-6">
        <h3 className="font-medium text-white mb-4">Choose Export Format</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {exportOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                setSelectedFormat(option.id);
                setExportedCode(null);
              }}
              className={`
                p-4 rounded-lg border text-left transition-all
                ${selectedFormat === option.id
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#1a1a1a]'
                }
              `}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={
                    selectedFormat === option.id
                      ? 'text-primary-400'
                      : 'text-[#6a6a6a]'
                  }
                >
                  {option.icon}
                </div>
                <span className="font-medium text-white">{option.name}</span>
                {selectedFormat === option.id && (
                  <div className="w-2 h-2 rounded-full bg-primary-500 ml-auto" />
                )}
              </div>
              <p className="text-xs text-[#a0a0a0]">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration for database exports */}
      {selectedOption?.requiresConfig && (
        <div className="card p-6">
          <h3 className="font-medium text-white mb-4">Configuration</h3>
          <div className="max-w-md">
            <label className="label">Collection Name</label>
            <input
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="my_collection"
              className="input-field w-full"
            />
            <p className="text-xs text-[#6a6a6a] mt-2">
              The name of the collection/index in your vector database
            </p>
          </div>
        </div>
      )}

      {/* Export button */}
      {selectedFormat && (
        <div className="flex justify-center">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="btn-primary flex items-center gap-2 px-8"
          >
            {isExporting ? (
              <>
                <LoadingSpinner size="sm" />
                Exporting...
              </>
            ) : (
              <>
                <Download size={18} />
                {selectedFormat === 'json' || selectedFormat === 'csv'
                  ? 'Download File'
                  : 'Generate Code'}
              </>
            )}
          </button>
        </div>
      )}

      {/* Exported code display */}
      {exportedCode && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-white">Generated Code</h3>
            <button
              onClick={handleCopy}
              className="btn-secondary text-sm py-1.5 flex items-center gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle size={16} className="text-primary-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy Code
                </>
              )}
            </button>
          </div>
          <pre className="bg-[#0a0a0a] rounded-lg p-4 overflow-x-auto text-sm font-mono text-[#a0a0a0] max-h-96 overflow-y-auto">
            <code>{exportedCode}</code>
          </pre>
        </div>
      )}

      {/* Export summary */}
      <div className="card p-6">
        <h3 className="font-medium text-white mb-4">Export Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[#6a6a6a]">Chunks</p>
            <p className="text-white font-medium">{chunks.length}</p>
          </div>
          <div>
            <p className="text-[#6a6a6a]">Dimensions</p>
            <p className="text-white font-medium">{embeddings[0]?.length || 0}</p>
          </div>
          <div>
            <p className="text-[#6a6a6a]">Total Vectors</p>
            <p className="text-white font-medium">{embeddings.length}</p>
          </div>
          <div>
            <p className="text-[#6a6a6a]">Est. Size</p>
            <p className="text-white font-medium">
              {((chunks.length * embeddings[0]?.length * 4) / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
      </div>

      {/* Documentation links */}
      <div className="card p-6">
        <h3 className="font-medium text-white mb-4">Documentation</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="https://docs.trychroma.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-[#1a1a1a] rounded-lg hover:bg-[#2a2a2a] transition-colors"
          >
            <Database size={18} className="text-[#6a6a6a]" />
            <span className="text-sm text-[#a0a0a0]">ChromaDB Docs</span>
            <ExternalLink size={14} className="text-[#6a6a6a] ml-auto" />
          </a>
          <a
            href="https://docs.pinecone.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-[#1a1a1a] rounded-lg hover:bg-[#2a2a2a] transition-colors"
          >
            <Database size={18} className="text-[#6a6a6a]" />
            <span className="text-sm text-[#a0a0a0]">Pinecone Docs</span>
            <ExternalLink size={14} className="text-[#6a6a6a] ml-auto" />
          </a>
          <a
            href="https://qdrant.tech/documentation/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-[#1a1a1a] rounded-lg hover:bg-[#2a2a2a] transition-colors"
          >
            <Database size={18} className="text-[#6a6a6a]" />
            <span className="text-sm text-[#a0a0a0]">Qdrant Docs</span>
            <ExternalLink size={14} className="text-[#6a6a6a] ml-auto" />
          </a>
        </div>
      </div>
    </div>
  );
}
