import type {
  Assignment,
  CalendarEvent,
  MonthViewData,
  WeekViewData,
  Chunk,
  GeneratedContent,
  GenerationResult,
  CronJob,
  JobRun,
  SyncResult
} from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Assignment API
export const assignmentApi = {
  list: (params?: {
    course_id?: number;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.course_id) searchParams.set('course_id', String(params.course_id));
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    return fetchJson<Assignment[]>(`${API_BASE}/assignments/${query ? `?${query}` : ''}`);
  },

  get: (id: number) =>
    fetchJson<Assignment>(`${API_BASE}/assignments/${id}`),

  getUpcoming: (days = 7) =>
    fetchJson<Assignment[]>(`${API_BASE}/assignments/upcoming?days=${days}`),

  sync: (courseIds?: number[]) =>
    fetchJson<SyncResult>(`${API_BASE}/assignments/sync`, {
      method: 'POST',
      body: JSON.stringify({ course_ids: courseIds }),
    }),

  getChunks: (id: number) =>
    fetchJson<Chunk[]>(`${API_BASE}/assignments/${id}/chunks`),

  processChunks: (id: number, options?: {
    collection_name?: string;
    embedding_model?: string;
    n_results?: number;
  }) =>
    fetchJson<Chunk[]>(`${API_BASE}/assignments/${id}/process`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),

  getStudyGuide: (id: number) =>
    fetchJson<GeneratedContent>(`${API_BASE}/assignments/${id}/study-guide`),

  generateStudyGuide: (id: number, options?: {
    model?: string;
    max_context_tokens?: number;
  }) =>
    fetchJson<GenerationResult>(`${API_BASE}/assignments/${id}/study-guide/generate`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),

  getSolution: (id: number) =>
    fetchJson<GeneratedContent>(`${API_BASE}/assignments/${id}/solution`),

  generateSolution: (id: number, options?: {
    model?: string;
    max_context_tokens?: number;
  }) =>
    fetchJson<GenerationResult>(`${API_BASE}/assignments/${id}/solution/generate`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),
};

// Calendar API
export const calendarApi = {
  getEvents: (startDate: string, endDate: string, options?: {
    include_assignments?: boolean;
    course_ids?: number[];
  }) => {
    const searchParams = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    if (options?.include_assignments !== undefined) {
      searchParams.set('include_assignments', String(options.include_assignments));
    }
    if (options?.course_ids?.length) {
      searchParams.set('course_ids', options.course_ids.join(','));
    }
    return fetchJson<CalendarEvent[]>(`${API_BASE}/calendar/events?${searchParams}`);
  },

  getMonthView: (year: number, month: number, options?: {
    include_assignments?: boolean;
    course_ids?: number[];
  }) => {
    const searchParams = new URLSearchParams();
    if (options?.include_assignments !== undefined) {
      searchParams.set('include_assignments', String(options.include_assignments));
    }
    if (options?.course_ids?.length) {
      searchParams.set('course_ids', options.course_ids.join(','));
    }
    const query = searchParams.toString();
    return fetchJson<MonthViewData>(
      `${API_BASE}/calendar/month/${year}/${month}${query ? `?${query}` : ''}`
    );
  },

  getWeekView: (date?: string, options?: {
    include_assignments?: boolean;
    course_ids?: number[];
  }) => {
    const searchParams = new URLSearchParams();
    if (date) searchParams.set('date', date);
    if (options?.include_assignments !== undefined) {
      searchParams.set('include_assignments', String(options.include_assignments));
    }
    if (options?.course_ids?.length) {
      searchParams.set('course_ids', options.course_ids.join(','));
    }
    const query = searchParams.toString();
    return fetchJson<WeekViewData>(`${API_BASE}/calendar/week${query ? `?${query}` : ''}`);
  },

  getDayEvents: (date: string, options?: {
    include_assignments?: boolean;
    course_ids?: number[];
  }) => {
    const searchParams = new URLSearchParams();
    if (options?.include_assignments !== undefined) {
      searchParams.set('include_assignments', String(options.include_assignments));
    }
    if (options?.course_ids?.length) {
      searchParams.set('course_ids', options.course_ids.join(','));
    }
    const query = searchParams.toString();
    return fetchJson<CalendarEvent[]>(`${API_BASE}/calendar/day/${date}${query ? `?${query}` : ''}`);
  },

  getUpcoming: (days = 7) =>
    fetchJson<CalendarEvent[]>(`${API_BASE}/calendar/upcoming?days=${days}`),

  sync: (startDate: string, endDate: string, contextCodes?: string[]) =>
    fetchJson<SyncResult>(`${API_BASE}/calendar/sync`, {
      method: 'POST',
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate,
        context_codes: contextCodes,
      }),
    }),
};

// Cron API
export const cronApi = {
  listJobs: () =>
    fetchJson<CronJob[]>(`${API_BASE}/cron/jobs`),

  getJob: (id: number) =>
    fetchJson<CronJob>(`${API_BASE}/cron/jobs/${id}`),

  createJob: (job: {
    name: string;
    job_type: string;
    schedule: string;
    enabled?: boolean;
    config?: Record<string, unknown>;
  }) =>
    fetchJson<CronJob>(`${API_BASE}/cron/jobs`, {
      method: 'POST',
      body: JSON.stringify(job),
    }),

  updateJob: (id: number, updates: Partial<{
    name: string;
    job_type: string;
    schedule: string;
    enabled: boolean;
    config: Record<string, unknown>;
  }>) =>
    fetchJson<CronJob>(`${API_BASE}/cron/jobs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deleteJob: (id: number) =>
    fetchJson<{ status: string; job_id: number }>(`${API_BASE}/cron/jobs/${id}`, {
      method: 'DELETE',
    }),

  runJob: (id: number) =>
    fetchJson<{ status: string; run_id: number; result?: Record<string, unknown>; error?: string }>(
      `${API_BASE}/cron/jobs/${id}/run`,
      { method: 'POST' }
    ),

  enableJob: (id: number) =>
    fetchJson<{ status: string; job_id: number }>(`${API_BASE}/cron/jobs/${id}/enable`, {
      method: 'POST',
    }),

  disableJob: (id: number) =>
    fetchJson<{ status: string; job_id: number }>(`${API_BASE}/cron/jobs/${id}/disable`, {
      method: 'POST',
    }),

  getJobHistory: (id: number, limit = 50) =>
    fetchJson<JobRun[]>(`${API_BASE}/cron/jobs/${id}/history?limit=${limit}`),

  getRecentRuns: (limit = 50) =>
    fetchJson<JobRun[]>(`${API_BASE}/cron/runs?limit=${limit}`),

  getJobTypes: () =>
    fetchJson<{ job_types: string[] }>(`${API_BASE}/cron/jobs/types`),
};
