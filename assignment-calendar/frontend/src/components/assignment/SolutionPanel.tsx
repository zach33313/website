import { useState } from 'react';
import { AlertTriangle, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { GeneratedContent } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface SolutionPanelProps {
  content: GeneratedContent | null;
  loading: boolean;
  generating: boolean;
  onGenerate: () => void;
  onFetch: () => void;
}

export function SolutionPanel({
  content,
  loading,
  generating,
  onGenerate,
}: SolutionPanelProps) {
  const [confirmed, setConfirmed] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!content && !confirmed) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex p-4 bg-yellow-500/10 rounded-full mb-4">
          <AlertTriangle size={48} className="text-yellow-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          Nuclear Option: Solution Generation
        </h3>
        <p className="text-[#6a6a6a] mb-6 max-w-lg mx-auto">
          This feature generates a complete solution attempt for this assignment.
          Please use this responsibly and in accordance with your institution's
          academic integrity policies.
        </p>
        <div className="bg-[#1a1a1a] border border-yellow-500/30 rounded-lg p-4 max-w-md mx-auto mb-6">
          <ul className="text-sm text-[#a0a0a0] text-left space-y-2">
            <li>• Solutions are AI-generated and may contain errors</li>
            <li>• Always verify answers against course materials</li>
            <li>• Use as a learning aid, not for direct submission</li>
            <li>• Citations reference source materials for verification</li>
          </ul>
        </div>
        <button
          onClick={() => setConfirmed(true)}
          className="px-6 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded-lg hover:bg-yellow-500/30 transition-colors"
        >
          I Understand, Continue
        </button>
      </div>
    );
  }

  if (!content && confirmed) {
    return (
      <div className="text-center py-12">
        <Zap size={48} className="mx-auto text-yellow-500 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">
          Ready to Generate Solution
        </h3>
        <p className="text-[#6a6a6a] mb-4">
          The AI will attempt to solve this assignment using your course materials.
        </p>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
        >
          {generating ? (
            <>
              <LoadingSpinner size="sm" />
              Generating Solution...
            </>
          ) : (
            <>
              <Zap size={16} />
              Generate Solution
            </>
          )}
        </button>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-yellow-500" />
          <span className="text-sm text-yellow-400">Solution Attempt</span>
        </div>
        <div className="text-sm text-[#6a6a6a]">
          Generated with {content.model_used} on{' '}
          {new Date(content.created_at).toLocaleDateString()}
        </div>
      </div>

      {content.citations && content.citations.length > 0 && (
        <div className="p-3 bg-[#141414] rounded-lg border border-yellow-500/30">
          <div className="text-xs text-[#6a6a6a] mb-2">Sources referenced:</div>
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

      <div className="prose prose-invert prose-sm max-w-none solution-content">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {content.content_markdown}
        </ReactMarkdown>
      </div>

      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <strong>Reminder:</strong> This solution is AI-generated and may contain
            errors. Always verify against course materials and use only as a learning
            aid.
          </div>
        </div>
      </div>
    </div>
  );
}
