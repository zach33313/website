import { FileDropzone } from './FileDropzone';
import { useStore } from '../../stores/useStore';
import { StatsCard } from '../common/StatsCard';
import { FileText, Hash, Type, ArrowRight } from 'lucide-react';

export function UploadPanel() {
  const { document, setActiveTab } = useStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Upload Document</h2>
        <p className="text-[#a0a0a0]">
          Start by uploading a document or pasting text. We'll analyze it and prepare it for chunking.
        </p>
      </div>

      <FileDropzone />

      {document && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard
              label="Characters"
              value={document.metadata.char_count.toLocaleString()}
              icon={<Type size={20} />}
            />
            <StatsCard
              label="Words"
              value={document.metadata.word_count.toLocaleString()}
              icon={<Hash size={20} />}
            />
            <StatsCard
              label="Lines"
              value={document.metadata.line_count.toLocaleString()}
              icon={<FileText size={20} />}
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setActiveTab('chunking')}
              className="btn-primary flex items-center gap-2"
            >
              Continue to Chunking
              <ArrowRight size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
