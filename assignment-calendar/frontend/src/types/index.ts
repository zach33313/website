// Calendar types
export interface CalendarEvent {
  id: number;
  title: string;
  start_at: string;
  end_at: string | null;
  event_type: 'assignment' | 'event' | 'quiz';
  source: 'canvas' | 'local';
  course_name: string | null;
  course_id: number | null;
  description: string | null;
  html_url: string | null;
  points_possible: number | null;
  canvas_id: number | null;
}

export interface DayData {
  day: number;
  date: string;
  events: CalendarEvent[];
  is_current_month: boolean;
}

export interface MonthViewData {
  year: number;
  month: number;
  month_name: string;
  weeks: DayData[][];
  total_events: number;
}

export interface WeekViewData {
  week_start: string;
  week_end: string;
  days: {
    date: string;
    day_name: string;
    day_short: string;
    is_today: boolean;
    events: CalendarEvent[];
  }[];
  total_events: number;
}

// Assignment types
export interface Assignment {
  id: number;
  canvas_assignment_id: number;
  course_id: number;
  course_name: string;
  name: string;
  description: string | null;
  due_at: string | null;
  points_possible: number | null;
  submission_types: string | null;
  html_url: string | null;
  last_synced_at: string | null;
  chunks_generated: boolean;
  study_guide_generated: boolean;
}

export interface Chunk {
  chunk_id: string;
  content: string;
  filename: string;
  relevance_score: number;
  metadata: Record<string, unknown>;
}

export interface GeneratedContent {
  id: number;
  assignment_id: number;
  content_type: 'study_guide' | 'solution';
  content_markdown: string;
  citations: string[] | null;
  model_used: string | null;
  created_at: string;
}

export interface GenerationResult {
  content_markdown: string;
  citations: { filename: string; reference: string }[];
  model_used: string;
  token_usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Cron types
export interface CronJob {
  id: number;
  name: string;
  job_type: string;
  schedule: string;
  enabled: boolean;
  config: Record<string, unknown> | null;
  last_run_at: string | null;
  next_run_at: string | null;
  is_scheduled: boolean;
}

export interface JobRun {
  id: number;
  job_id: number;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
}

// Sync types
export interface SyncResult {
  total_synced: number;
  new_assignments?: number;
  updated_assignments?: number;
  new_events?: number;
  updated_events?: number;
  courses_processed?: number;
  errors: string[];
}

// View types
export type CalendarView = 'month' | 'week' | 'day';
export type AssignmentTab = 'knowledge' | 'study-guide' | 'solution';
