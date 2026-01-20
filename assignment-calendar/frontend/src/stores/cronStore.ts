import { create } from 'zustand';
import type { CronJob, JobRun } from '../types';
import { cronApi } from '../services/api';

interface CronState {
  jobs: CronJob[];
  recentRuns: JobRun[];
  selectedJobId: number | null;
  jobHistory: JobRun[];
  jobTypes: string[];
  loading: boolean;
  running: boolean;
  error: string | null;

  // Actions
  fetchJobs: () => Promise<void>;
  fetchJobTypes: () => Promise<void>;
  fetchRecentRuns: () => Promise<void>;
  selectJob: (id: number | null) => void;
  fetchJobHistory: (id: number) => Promise<void>;
  createJob: (job: {
    name: string;
    job_type: string;
    schedule: string;
    enabled?: boolean;
    config?: Record<string, unknown>;
  }) => Promise<void>;
  updateJob: (id: number, updates: Partial<CronJob>) => Promise<void>;
  deleteJob: (id: number) => Promise<void>;
  runJob: (id: number) => Promise<void>;
  toggleJob: (id: number, enabled: boolean) => Promise<void>;
}

export const useCronStore = create<CronState>((set, get) => ({
  jobs: [],
  recentRuns: [],
  selectedJobId: null,
  jobHistory: [],
  jobTypes: [],
  loading: false,
  running: false,
  error: null,

  fetchJobs: async () => {
    set({ loading: true, error: null });

    try {
      const jobs = await cronApi.listJobs();
      set({ jobs, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch jobs', loading: false });
    }
  },

  fetchJobTypes: async () => {
    try {
      const response = await cronApi.getJobTypes();
      set({ jobTypes: response.job_types });
    } catch (err) {
      console.error('Failed to fetch job types:', err);
    }
  },

  fetchRecentRuns: async () => {
    try {
      const recentRuns = await cronApi.getRecentRuns(20);
      set({ recentRuns });
    } catch (err) {
      console.error('Failed to fetch recent runs:', err);
    }
  },

  selectJob: (id) => {
    set({ selectedJobId: id, jobHistory: [] });
    if (id) {
      get().fetchJobHistory(id);
    }
  },

  fetchJobHistory: async (id) => {
    try {
      const jobHistory = await cronApi.getJobHistory(id, 20);
      set({ jobHistory });
    } catch (err) {
      console.error('Failed to fetch job history:', err);
    }
  },

  createJob: async (job) => {
    set({ loading: true, error: null });

    try {
      await cronApi.createJob(job);
      await get().fetchJobs();
      set({ loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create job', loading: false });
    }
  },

  updateJob: async (id, updates) => {
    set({ loading: true, error: null });

    try {
      // Filter out null config values for the API
      const apiUpdates = {
        ...updates,
        config: updates.config === null ? undefined : updates.config,
      };
      await cronApi.updateJob(id, apiUpdates);
      await get().fetchJobs();
      set({ loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update job', loading: false });
    }
  },

  deleteJob: async (id) => {
    set({ loading: true, error: null });

    try {
      await cronApi.deleteJob(id);
      set({ selectedJobId: null, jobHistory: [] });
      await get().fetchJobs();
      set({ loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete job', loading: false });
    }
  },

  runJob: async (id) => {
    set({ running: true, error: null });

    try {
      const result = await cronApi.runJob(id);
      if (result.error) {
        set({ error: result.error, running: false });
      } else {
        set({ running: false });
      }
      await get().fetchJobs();
      await get().fetchRecentRuns();
      if (get().selectedJobId === id) {
        await get().fetchJobHistory(id);
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to run job', running: false });
    }
  },

  toggleJob: async (id, enabled) => {
    set({ loading: true, error: null });

    try {
      if (enabled) {
        await cronApi.enableJob(id);
      } else {
        await cronApi.disableJob(id);
      }
      await get().fetchJobs();
      set({ loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to toggle job', loading: false });
    }
  },
}));
