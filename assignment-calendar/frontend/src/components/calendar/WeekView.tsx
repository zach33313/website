import { clsx } from 'clsx';
import { EventCard } from './EventCard';
import type { WeekViewData, CalendarEvent } from '../../types';

interface WeekViewProps {
  data: WeekViewData;
  onEventClick: (event: CalendarEvent) => void;
}

export function WeekView({ data, onEventClick }: WeekViewProps) {
  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-[#2a2a2a]">
        {data.days.map((day) => (
          <div key={day.date} className="min-h-[400px]">
            {/* Day header */}
            <div
              className={clsx(
                'p-3 text-center border-b border-[#2a2a2a]',
                day.is_today && 'bg-primary-500/10'
              )}
            >
              <div className="text-xs text-[#6a6a6a] uppercase">
                {day.day_short}
              </div>
              <div
                className={clsx(
                  'text-2xl font-semibold',
                  day.is_today ? 'text-primary-400' : 'text-white'
                )}
              >
                {new Date(day.date).getDate()}
              </div>
            </div>

            {/* Events */}
            <div className="p-2 space-y-2">
              {day.events.map((event, i) => (
                <EventCard
                  key={i}
                  event={event as CalendarEvent}
                  onClick={() => onEventClick(event as CalendarEvent)}
                />
              ))}
              {day.events.length === 0 && (
                <p className="text-center text-sm text-[#4a4a4a] py-4">
                  No events
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
