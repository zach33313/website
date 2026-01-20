import { clsx } from 'clsx';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { JobRun } from '../../types';

interface JobHistoryProps {
  runs: JobRun[];
  showJobName?: boolean;
}

export function JobHistory({ runs, showJobName: _showJobName = false }: JobHistoryProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'failed':
        return <XCircle size={16} className="text-red-400" />;
      case 'running':
        return <Loader2 size={16} className="text-primary-400 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'running':
        return 'text-primary-400';
      default:
        return 'text-[#6a6a6a]';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getDuration = (start: string, end: string | null) => {
    if (!end) return 'Running...';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <div
          key={run.id}
          className="p-3 bg-[#141414] rounded-lg border border-[#2a2a2a]"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(run.status)}
              <span className={clsx('text-sm font-medium', getStatusColor(run.status))}>
                {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
              </span>
            </div>
            <div className="text-xs text-[#6a6a6a]">
              {getDuration(run.started_at, run.completed_at)}
            </div>
          </div>

          <div className="text-xs text-[#6a6a6a] mt-2">
            {formatDate(run.started_at)}
          </div>

          {run.error && (
            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300">
              {run.error}
            </div>
          )}

          {run.result && Object.keys(run.result).length > 0 && (
            <div className="mt-2 p-2 bg-[#0a0a0a] rounded">
              <pre className="text-xs text-[#a0a0a0] overflow-x-auto">
                {JSON.stringify(run.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}

      {runs.length === 0 && (
        <div className="text-center py-4 text-[#6a6a6a] text-sm">
          No run history yet.
        </div>
      )}
    </div>
  );
}
