import { clsx } from 'clsx';
import { Play, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import type { CronJob } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface JobListProps {
  jobs: CronJob[];
  selectedJobId: number | null;
  onSelect: (id: number) => void;
  onRun: (id: number) => void;
  onToggle: (id: number, enabled: boolean) => void;
  running: boolean;
}

export function JobList({
  jobs,
  selectedJobId,
  onSelect,
  onRun,
  onToggle,
  running,
}: JobListProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <div
          key={job.id}
          className={clsx(
            'p-4 rounded-lg border transition-colors cursor-pointer',
            selectedJobId === job.id
              ? 'bg-[#1a1a1a] border-primary-500/50'
              : 'bg-[#141414] border-[#2a2a2a] hover:border-[#3a3a3a]'
          )}
          onClick={() => onSelect(job.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-white truncate">{job.name}</h3>
                <span
                  className={clsx(
                    'text-xs px-2 py-0.5 rounded',
                    job.enabled
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-[#2a2a2a] text-[#6a6a6a]'
                  )}
                >
                  {job.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-[#6a6a6a]">
                <span className="font-mono">{job.schedule}</span>
                <span className="text-[#4a4a4a]">|</span>
                <span>{job.job_type}</span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-[#6a6a6a]">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  Last: {formatDate(job.last_run_at)}
                </div>
                {job.next_run_at && (
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    Next: {formatDate(job.next_run_at)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(job.id, !job.enabled);
                }}
                className={clsx(
                  'p-2 rounded transition-colors',
                  job.enabled
                    ? 'text-green-400 hover:bg-green-500/20'
                    : 'text-[#6a6a6a] hover:bg-[#2a2a2a]'
                )}
                title={job.enabled ? 'Disable job' : 'Enable job'}
              >
                {job.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRun(job.id);
                }}
                disabled={running}
                className="p-2 rounded text-primary-400 hover:bg-primary-500/20 transition-colors disabled:opacity-50"
                title="Run now"
              >
                {running ? <LoadingSpinner size="sm" /> : <Play size={20} />}
              </button>
            </div>
          </div>
        </div>
      ))}

      {jobs.length === 0 && (
        <div className="text-center py-8 text-[#6a6a6a]">
          No jobs configured. Create one to get started.
        </div>
      )}
    </div>
  );
}
