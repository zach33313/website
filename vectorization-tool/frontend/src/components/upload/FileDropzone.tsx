import { useCallback, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { useStore } from '../../stores/useStore';
import { uploadDocument, parseText } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';

export function FileDropzone() {
  const { document, setDocument, setIsUploading, isUploading, setError, setActiveTab, resetAll } = useStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    const allowedTypes = ['.txt', '.md', '.pdf', '.json', '.docx'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(ext)) {
      setError(`Unsupported file type: ${ext}. Allowed: ${allowedTypes.join(', ')}`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const doc = await uploadDocument(file);
      setDocument(doc);
      setActiveTab('chunking');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [setDocument, setIsUploading, setError, setActiveTab]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) {
      setError('Please enter some text');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const doc = await parseText(textInput, 'direct-input.txt');
      setDocument(doc);
      setActiveTab('chunking');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse text');
    } finally {
      setIsUploading(false);
    }
  }, [textInput, setDocument, setIsUploading, setError, setActiveTab]);

  const handleRemoveDocument = useCallback(() => {
    resetAll();
    setTextInput('');
  }, [resetAll]);

  if (document) {
    return (
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-500/10 rounded-lg">
              <FileText className="text-primary-400" size={24} />
            </div>
            <div>
              <h3 className="font-medium text-white">{document.filename}</h3>
              <p className="text-sm text-[#a0a0a0] mt-1">
                {document.metadata.file_type.toUpperCase()} • {document.metadata.char_count.toLocaleString()} characters • {document.metadata.word_count.toLocaleString()} words
              </p>
            </div>
          </div>
          <button
            onClick={handleRemoveDocument}
            className="p-2 text-[#a0a0a0] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Remove document"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 p-4 bg-[#1a1a1a] rounded-lg max-h-48 overflow-y-auto">
          <pre className="text-sm text-[#a0a0a0] whitespace-pre-wrap font-mono">
            {document.content.slice(0, 1000)}
            {document.content.length > 1000 && '...'}
          </pre>
        </div>
      </div>
    );
  }

  if (isUploading) {
    return (
      <div className="card p-12 flex items-center justify-center">
        <LoadingSpinner text="Processing document..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          card p-12 border-2 border-dashed transition-all cursor-pointer
          ${isDragOver
            ? 'border-primary-500 bg-primary-500/5'
            : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
          }
        `}
      >
        <input
          type="file"
          id="file-input"
          className="hidden"
          accept=".txt,.md,.pdf,.json,.docx"
          onChange={handleFileInput}
        />
        <label htmlFor="file-input" className="cursor-pointer">
          <div className="flex flex-col items-center text-center">
            <div className="p-4 bg-[#1a1a1a] rounded-full mb-4">
              <Upload className="text-primary-400" size={32} />
            </div>
            <h3 className="font-medium text-white mb-2">
              Drop your document here
            </h3>
            <p className="text-sm text-[#a0a0a0] mb-4">
              or click to browse
            </p>
            <p className="text-xs text-[#6a6a6a]">
              Supports TXT, MD, PDF, JSON, DOCX
            </p>
          </div>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-[#2a2a2a]" />
        <span className="text-sm text-[#6a6a6a]">or</span>
        <div className="flex-1 h-px bg-[#2a2a2a]" />
      </div>

      {showTextInput ? (
        <div className="card p-4 space-y-4">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste your text here..."
            className="w-full h-48 input-field resize-none font-mono text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowTextInput(false);
                setTextInput('');
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleTextSubmit}
              className="btn-primary"
              disabled={!textInput.trim()}
            >
              Process Text
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowTextInput(true)}
          className="w-full btn-secondary"
        >
          Enter text directly
        </button>
      )}
    </div>
  );
}
