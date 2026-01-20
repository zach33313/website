import { create } from 'zustand';
import type { CalendarView, CalendarEvent, MonthViewData, WeekViewData } from '../types';
import { calendarApi } from '../services/api';

interface CalendarState {
  view: CalendarView;
  currentDate: Date;
  selectedDate: string | null;
  monthData: MonthViewData | null;
  weekData: WeekViewData | null;
  dayEvents: CalendarEvent[];
  selectedCourseIds: number[];
  loading: boolean;
  error: string | null;

  // Actions
  setView: (view: CalendarView) => void;
  setCurrentDate: (date: Date) => void;
  selectDate: (date: string | null) => void;
  setSelectedCourseIds: (ids: number[]) => void;
  fetchMonthData: () => Promise<void>;
  fetchWeekData: (date?: string) => Promise<void>;
  fetchDayEvents: (date: string) => Promise<void>;
  syncCalendar: () => Promise<void>;
  nextMonth: () => void;
  prevMonth: () => void;
  nextWeek: () => void;
  prevWeek: () => void;
  goToToday: () => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  view: 'month',
  currentDate: new Date(),
  selectedDate: null,
  monthData: null,
  weekData: null,
  dayEvents: [],
  selectedCourseIds: [],
  loading: false,
  error: null,

  setView: (view) => set({ view }),

  setCurrentDate: (date) => set({ currentDate: date }),

  selectDate: (date) => set({ selectedDate: date }),

  setSelectedCourseIds: (ids) => set({ selectedCourseIds: ids }),

  fetchMonthData: async () => {
    const { currentDate, selectedCourseIds } = get();
    set({ loading: true, error: null });

    try {
      const data = await calendarApi.getMonthView(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        {
          include_assignments: true,
          course_ids: selectedCourseIds.length > 0 ? selectedCourseIds : undefined,
        }
      );
      set({ monthData: data, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch calendar', loading: false });
    }
  },

  fetchWeekData: async (date) => {
    const { selectedCourseIds } = get();
    set({ loading: true, error: null });

    try {
      const data = await calendarApi.getWeekView(date, {
        include_assignments: true,
        course_ids: selectedCourseIds.length > 0 ? selectedCourseIds : undefined,
      });
      set({ weekData: data, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch week', loading: false });
    }
  },

  fetchDayEvents: async (date) => {
    const { selectedCourseIds } = get();
    set({ loading: true, error: null });

    try {
      const events = await calendarApi.getDayEvents(date, {
        include_assignments: true,
        course_ids: selectedCourseIds.length > 0 ? selectedCourseIds : undefined,
      });
      set({ dayEvents: events, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch events', loading: false });
    }
  },

  syncCalendar: async () => {
    const { currentDate } = get();
    set({ loading: true, error: null });

    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      // Sync 3 months: previous, current, next
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month + 2, 0).toISOString();

      await calendarApi.sync(startDate, endDate);
      await get().fetchMonthData();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Sync failed', loading: false });
    }
  },

  nextMonth: () => {
    const { currentDate } = get();
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    set({ currentDate: newDate });
    get().fetchMonthData();
  },

  prevMonth: () => {
    const { currentDate } = get();
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    set({ currentDate: newDate });
    get().fetchMonthData();
  },

  nextWeek: () => {
    const { currentDate } = get();
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    set({ currentDate: newDate });
    get().fetchWeekData(newDate.toISOString());
  },

  prevWeek: () => {
    const { currentDate } = get();
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    set({ currentDate: newDate });
    get().fetchWeekData(newDate.toISOString());
  },

  goToToday: () => {
    set({ currentDate: new Date() });
    const { view } = get();
    if (view === 'month') {
      get().fetchMonthData();
    } else if (view === 'week') {
      get().fetchWeekData();
    }
  },
}));
