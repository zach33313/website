import { useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RefreshCw,
} from 'lucide-react';
import { useCalendarStore } from '../../stores/calendarStore';
import { useAssignmentStore } from '../../stores/assignmentStore';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { TabNav } from '../common/TabNav';
import type { CalendarEvent, CalendarView } from '../../types';

const VIEW_TABS = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
];

export function CalendarPanel() {
  const {
    view,
    currentDate,
    monthData,
    weekData,
    loading,
    error,
    setView,
    fetchMonthData,
    fetchWeekData,
    syncCalendar,
    nextMonth,
    prevMonth,
    nextWeek,
    prevWeek,
    goToToday,
  } = useCalendarStore();

  const { selectAssignment } = useAssignmentStore();

  useEffect(() => {
    if (view === 'month') {
      fetchMonthData();
    } else if (view === 'week') {
      fetchWeekData();
    }
  }, [view, fetchMonthData, fetchWeekData]);

  const handleEventClick = (event: CalendarEvent) => {
    if (event.event_type === 'assignment') {
      selectAssignment(event.id);
    }
  };

  const handleDayClick = (date: string) => {
    // Could open a day detail view
    console.log('Day clicked:', date);
  };

  const handlePrev = () => {
    if (view === 'month') {
      prevMonth();
    } else {
      prevWeek();
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      nextMonth();
    } else {
      nextWeek();
    }
  };

  const getTitle = () => {
    if (view === 'month' && monthData) {
      return `${monthData.month_name} ${monthData.year}`;
    }
    if (view === 'week' && weekData) {
      const start = new Date(weekData.week_start);
      const end = new Date(weekData.week_end);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-2 rounded-lg hover:bg-[#2a2a2a] text-[#a0a0a0] hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-lg hover:bg-[#2a2a2a] text-[#a0a0a0] hover:text-white transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <h2 className="text-xl font-semibold text-white">{getTitle()}</h2>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={goToToday}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-[#2a2a2a] text-[#a0a0a0] hover:text-white transition-colors"
          >
            <CalendarIcon size={16} />
            Today
          </button>

          <button
            onClick={syncCalendar}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Sync
          </button>

          <TabNav
            tabs={VIEW_TABS}
            activeTab={view}
            onChange={(v) => setView(v as CalendarView)}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300">
          {error}
        </div>
      )}

      {/* Calendar View */}
      {loading && !monthData && !weekData ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {view === 'month' && monthData && (
            <MonthView
              data={monthData}
              onEventClick={handleEventClick}
              onDayClick={handleDayClick}
            />
          )}
          {view === 'week' && weekData && (
            <WeekView data={weekData} onEventClick={handleEventClick} />
          )}
        </>
      )}
    </div>
  );
}
