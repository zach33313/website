import { clsx } from 'clsx';
import { EventCard } from './EventCard';
import type { MonthViewData, CalendarEvent } from '../../types';

interface MonthViewProps {
  data: MonthViewData;
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: string) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthView({ data, onEventClick, onDayClick }: MonthViewProps) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-[#2a2a2a]">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-sm font-medium text-[#6a6a6a]"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {data.weeks.map((week, weekIndex) =>
          week.map((day, dayIndex) => {
            const isToday = day.date === today;
            const hasEvents = day.events.length > 0;

            return (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={clsx(
                  'min-h-[120px] p-2 border-b border-r border-[#2a2a2a]',
                  'last:border-r-0',
                  !day.is_current_month && 'bg-[#141414]'
                )}
              >
                <button
                  onClick={() => onDayClick(day.date)}
                  className={clsx(
                    'w-8 h-8 rounded-full text-sm font-medium mb-1',
                    'hover:bg-[#2a2a2a] transition-colors',
                    isToday && 'bg-primary-500 text-white hover:bg-primary-600',
                    !isToday && day.is_current_month && 'text-white',
                    !isToday && !day.is_current_month && 'text-[#4a4a4a]'
                  )}
                >
                  {day.day}
                </button>

                {hasEvents && (
                  <div className="space-y-1">
                    {day.events.slice(0, 3).map((event, i) => (
                      <EventCard
                        key={i}
                        event={event as CalendarEvent}
                        compact
                        onClick={() => onEventClick(event as CalendarEvent)}
                      />
                    ))}
                    {day.events.length > 3 && (
                      <button
                        onClick={() => onDayClick(day.date)}
                        className="text-xs text-[#6a6a6a] hover:text-white"
                      >
                        +{day.events.length - 3} more
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
