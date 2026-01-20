import { useState, useEffect } from 'react';

interface JobFormProps {
  jobTypes: string[];
  onSubmit: (job: {
    name: string;
    job_type: string;
    schedule: string;
    enabled: boolean;
    config?: Record<string, unknown>;
  }) => void;
  onCancel: () => void;
}

const SCHEDULE_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Daily at 6 AM', value: '0 6 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Weekly on Sunday', value: '0 0 * * 0' },
  { label: 'Custom', value: '' },
];

export function JobForm({ jobTypes, onSubmit, onCancel }: JobFormProps) {
  const [name, setName] = useState('');
  const [jobType, setJobType] = useState(jobTypes[0] || '');
  const [schedule, setSchedule] = useState('0 6 * * *');

  // Update jobType when jobTypes loads asynchronously
  useEffect(() => {
    if (jobTypes.length > 0 && !jobType) {
      setJobType(jobTypes[0]);
    }
  }, [jobTypes, jobType]);
  const [customSchedule, setCustomSchedule] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [configJson, setConfigJson] = useState('{}');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const finalSchedule = schedule || customSchedule;
    if (!finalSchedule) {
      setError('Schedule is required');
      return;
    }

    let config: Record<string, unknown> | undefined;
    try {
      const parsed = JSON.parse(configJson);
      if (Object.keys(parsed).length > 0) {
        config = parsed;
      }
    } catch {
      setError('Invalid JSON in config');
      return;
    }

    onSubmit({
      name,
      job_type: jobType,
      schedule: finalSchedule,
      enabled,
      config,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#a0a0a0] mb-1">
          Job Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 bg-[#141414] border border-[#2a2a2a] rounded-lg text-white placeholder-[#6a6a6a] focus:outline-none focus:border-primary-500"
          placeholder="e.g., Daily Assignment Sync"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#a0a0a0] mb-1">
          Job Type
        </label>
        <select
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
          required
          className="w-full px-3 py-2 bg-[#141414] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-primary-500"
        >
          {jobTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#a0a0a0] mb-1">
          Schedule
        </label>
        <select
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          className="w-full px-3 py-2 bg-[#141414] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-primary-500 mb-2"
        >
          {SCHEDULE_PRESETS.map((preset) => (
            <option key={preset.label} value={preset.value}>
              {preset.label} {preset.value && `(${preset.value})`}
            </option>
          ))}
        </select>
        {!schedule && (
          <input
            type="text"
            value={customSchedule}
            onChange={(e) => setCustomSchedule(e.target.value)}
            placeholder="Cron expression (e.g., 0 6 * * *)"
            className="w-full px-3 py-2 bg-[#141414] border border-[#2a2a2a] rounded-lg text-white placeholder-[#6a6a6a] focus:outline-none focus:border-primary-500 font-mono"
          />
        )}
        <p className="mt-1 text-xs text-[#6a6a6a]">
          Format: minute hour day month weekday
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#a0a0a0] mb-1">
          Configuration (JSON)
        </label>
        <textarea
          value={configJson}
          onChange={(e) => setConfigJson(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 bg-[#141414] border border-[#2a2a2a] rounded-lg text-white placeholder-[#6a6a6a] focus:outline-none focus:border-primary-500 font-mono text-sm"
          placeholder='{"course_ids": [123, 456]}'
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-4 h-4 rounded border-[#2a2a2a] bg-[#141414] text-primary-500 focus:ring-primary-500"
        />
        <label htmlFor="enabled" className="text-sm text-[#a0a0a0]">
          Enable immediately
        </label>
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-[#2a2a2a] text-[#a0a0a0] rounded-lg hover:bg-[#3a3a3a] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Create Job
        </button>
      </div>
    </form>
  );
}
