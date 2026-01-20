import { create } from 'zustand';
import type { Assignment, Chunk, GeneratedContent, AssignmentTab } from '../types';
import { assignmentApi } from '../services/api';

interface AssignmentState {
  assignment: Assignment | null;
  chunks: Chunk[];
  studyGuide: GeneratedContent | null;
  solution: GeneratedContent | null;
  activeTab: AssignmentTab;
  loading: boolean;
  generating: boolean;
  error: string | null;

  // Actions
  selectAssignment: (id: number) => Promise<void>;
  clearAssignment: () => void;
  setActiveTab: (tab: AssignmentTab) => void;
  fetchChunks: () => Promise<void>;
  processChunks: () => Promise<void>;
  fetchStudyGuide: () => Promise<void>;
  generateStudyGuide: () => Promise<void>;
  fetchSolution: () => Promise<void>;
  generateSolution: () => Promise<void>;
}

export const useAssignmentStore = create<AssignmentState>((set, get) => ({
  assignment: null,
  chunks: [],
  studyGuide: null,
  solution: null,
  activeTab: 'knowledge',
  loading: false,
  generating: false,
  error: null,

  selectAssignment: async (id) => {
    set({ loading: true, error: null, chunks: [], studyGuide: null, solution: null });

    try {
      const assignment = await assignmentApi.get(id);
      set({ assignment, loading: false });

      // Auto-fetch chunks if they exist
      if (assignment.chunks_generated) {
        get().fetchChunks();
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load assignment', loading: false });
    }
  },

  clearAssignment: () => {
    set({
      assignment: null,
      chunks: [],
      studyGuide: null,
      solution: null,
      activeTab: 'knowledge',
      error: null,
    });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchChunks: async () => {
    const { assignment } = get();
    if (!assignment) return;

    set({ loading: true, error: null });

    try {
      const chunks = await assignmentApi.getChunks(assignment.id);
      set({ chunks, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load chunks', loading: false });
    }
  },

  processChunks: async () => {
    const { assignment } = get();
    if (!assignment) return;

    set({ loading: true, error: null });

    try {
      const chunks = await assignmentApi.processChunks(assignment.id);
      set({ chunks, loading: false });

      // Refresh assignment to update flags
      const updated = await assignmentApi.get(assignment.id);
      set({ assignment: updated });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to process chunks', loading: false });
    }
  },

  fetchStudyGuide: async () => {
    const { assignment } = get();
    if (!assignment) return;

    set({ loading: true, error: null });

    try {
      const studyGuide = await assignmentApi.getStudyGuide(assignment.id);
      set({ studyGuide, loading: false });
    } catch (err) {
      // 404 is expected if no study guide exists yet
      if (err instanceof Error && err.message.includes('404')) {
        set({ studyGuide: null, loading: false });
      } else {
        set({ error: err instanceof Error ? err.message : 'Failed to load study guide', loading: false });
      }
    }
  },

  generateStudyGuide: async () => {
    const { assignment } = get();
    if (!assignment) return;

    set({ generating: true, error: null });

    try {
      const result = await assignmentApi.generateStudyGuide(assignment.id);
      set({
        studyGuide: {
          id: 0,
          assignment_id: assignment.id,
          content_type: 'study_guide',
          content_markdown: result.content_markdown,
          citations: result.citations.map(c => c.filename),
          model_used: result.model_used,
          created_at: new Date().toISOString(),
        },
        generating: false,
      });

      // Refresh assignment to update flags
      const updated = await assignmentApi.get(assignment.id);
      set({ assignment: updated });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to generate study guide', generating: false });
    }
  },

  fetchSolution: async () => {
    const { assignment } = get();
    if (!assignment) return;

    set({ loading: true, error: null });

    try {
      const solution = await assignmentApi.getSolution(assignment.id);
      set({ solution, loading: false });
    } catch (err) {
      // 404 is expected if no solution exists yet
      if (err instanceof Error && err.message.includes('404')) {
        set({ solution: null, loading: false });
      } else {
        set({ error: err instanceof Error ? err.message : 'Failed to load solution', loading: false });
      }
    }
  },

  generateSolution: async () => {
    const { assignment } = get();
    if (!assignment) return;

    set({ generating: true, error: null });

    try {
      const result = await assignmentApi.generateSolution(assignment.id);
      set({
        solution: {
          id: 0,
          assignment_id: assignment.id,
          content_type: 'solution',
          content_markdown: result.content_markdown,
          citations: result.citations.map(c => c.filename),
          model_used: result.model_used,
          created_at: new Date().toISOString(),
        },
        generating: false,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to generate solution', generating: false });
    }
  },
}));
