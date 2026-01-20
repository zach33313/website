import { BookOpen, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { GeneratedContent } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface StudyGuideViewerProps {
  content: GeneratedContent | null;
  loading: boolean;
  generating: boolean;
  onGenerate: () => void;
  onFetch: () => void;
}

export function StudyGuideViewer({
  content,
  loading,
  generating,
  onGenerate,
  onFetch: _onFetch,
}: StudyGuideViewerProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-12">
        <BookOpen size={48} className="mx-auto text-[#4a4a4a] mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">
          No study guide yet
        </h3>
        <p className="text-[#6a6a6a] mb-4 max-w-md mx-auto">
          Generate a comprehensive study guide based on relevant course materials
          for this assignment.
        </p>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
        >
          {generating ? (
            <>
              <LoadingSpinner size="sm" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate Study Guide
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[#6a6a6a]">
          Generated with {content.model_used} on{' '}
          {new Date(content.created_at).toLocaleDateString()}
        </div>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
        >
          {generating ? (
            <>
              <LoadingSpinner size="sm" />
              Regenerating...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Regenerate
            </>
          )}
        </button>
      </div>

      {content.citations && content.citations.length > 0 && (
        <div className="p-3 bg-[#141414] rounded-lg border border-[#2a2a2a]">
          <div className="text-xs text-[#6a6a6a] mb-2">Sources cited:</div>
          <div className="flex flex-wrap gap-2">
            {content.citations.map((citation, i) => (
              <span
                key={i}
                className="text-xs px-2 py-1 bg-[#2a2a2a] text-[#a0a0a0] rounded"
              >
                {citation}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="prose prose-invert prose-sm max-w-none study-guide-content">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {content.content_markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}
