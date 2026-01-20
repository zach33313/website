import { clsx } from 'clsx';
import { FileText, Calendar as CalendarIcon, HelpCircle } from 'lucide-react';
import type { CalendarEvent } from '../../types';

interface EventCardProps {
  event: CalendarEvent;
  compact?: boolean;
  onClick?: () => void;
}

const eventTypeConfig = {
  assignment: {
    color: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
    icon: FileText,
  },
  event: {
    color: 'bg-green-500/20 border-green-500/50 text-green-300',
    icon: CalendarIcon,
  },
  quiz: {
    color: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
    icon: HelpCircle,
  },
};

export function EventCard({ event, compact = false, onClick }: EventCardProps) {
  const config = eventTypeConfig[event.event_type] || eventTypeConfig.event;
  const Icon = config.icon;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={clsx(
          'w-full text-left text-xs px-1 py-0.5 rounded truncate',
          'border-l-2 hover:opacity-80 transition-opacity',
          config.color
        )}
      >
        {event.title}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left p-3 rounded-lg border transition-all',
        'hover:scale-[1.02] hover:shadow-md',
        config.color
      )}
    >
      <div className="flex items-start gap-2">
        <Icon size={16} className="mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{event.title}</h4>
          {event.course_name && (
            <p className="text-xs opacity-70 truncate">{event.course_name}</p>
          )}
          {event.points_possible && (
            <p className="text-xs opacity-70">{event.points_possible} pts</p>
          )}
        </div>
      </div>
    </button>
  );
}
