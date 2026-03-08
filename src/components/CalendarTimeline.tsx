'use client';

import { useEffect, useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';

interface TimelineEvent {
  id?: string;
  summary: string;
  start: string;
  end: string;
  status?: string;
}

interface CalendarTimelineProps {
  userId: string;
  date?: string; // YYYY-MM-DD
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 to 20:00

export function CalendarTimeline({ userId, date }: CalendarTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [type, setType] = useState<'events' | 'freeBusy'>('events');
  const [loading, setLoading] = useState(true);

  const dateStr = date || new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadEvents();
  }, [userId, dateStr]);

  async function loadEvents() {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar/events?userId=${userId}&date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setType(data.type || 'events');
        setEvents(data.items || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  function getEventPosition(event: TimelineEvent) {
    const start = new Date(event.start);
    const end = new Date(event.end);

    // Handle all-day events (date strings without time)
    if (!event.start.includes('T')) {
      return { top: 0, height: 100, isAllDay: true };
    }

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const dayStart = 7; // 7 AM
    const dayEnd = 21; // 9 PM
    const totalHours = dayEnd - dayStart;

    const top = Math.max(0, ((startHour - dayStart) / totalHours) * 100);
    const height = Math.max(3, ((endHour - startHour) / totalHours) * 100);

    return { top, height, isAllDay: false };
  }

  function formatTime(dateStr: string): string {
    if (!dateStr.includes('T')) return 'All day';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="animate-spin text-gray-400" size={20} />
      </div>
    );
  }

  const allDayEvents = events.filter((e) => !e.start.includes('T'));
  const timedEvents = events.filter((e) => e.start.includes('T'));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Calendar size={16} className="text-brand-600" />
        <span>{new Date(dateStr).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        {type === 'freeBusy' && (
          <span className="text-xs text-gray-400 ml-1">(free/busy only)</span>
        )}
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="space-y-1">
          {allDayEvents.map((event, i) => (
            <div
              key={event.id || i}
              className="px-3 py-1.5 text-xs font-medium bg-brand-100 text-brand-800 rounded-md"
            >
              {event.summary}
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      {timedEvents.length === 0 && allDayEvents.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">No events for this day</p>
      ) : timedEvents.length > 0 ? (
        <div className="relative border border-gray-200 rounded-lg overflow-hidden" style={{ minHeight: 280 }}>
          {/* Hour lines */}
          {HOURS.map((hour) => {
            const top = ((hour - 7) / 14) * 100;
            return (
              <div key={hour} className="absolute left-0 right-0" style={{ top: `${top}%` }}>
                <div className="flex items-center">
                  <span className="text-[10px] text-gray-400 w-10 text-right pr-2">{hour}:00</span>
                  <div className="flex-1 border-t border-gray-100" />
                </div>
              </div>
            );
          })}

          {/* Events */}
          <div className="absolute left-12 right-2 top-0 bottom-0">
            {timedEvents.map((event, i) => {
              const pos = getEventPosition(event);
              const isDone = event.summary.includes('[DONE]');
              return (
                <div
                  key={event.id || i}
                  className={`absolute left-0 right-0 rounded-md px-2 py-1 text-xs overflow-hidden ${
                    isDone
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : type === 'freeBusy'
                      ? 'bg-gray-200 text-gray-600 border border-gray-300'
                      : 'bg-brand-100 text-brand-800 border border-brand-200'
                  }`}
                  style={{
                    top: `${pos.top}%`,
                    height: `${Math.max(pos.height, 4)}%`,
                  }}
                  title={`${event.summary} (${formatTime(event.start)} - ${formatTime(event.end)})`}
                >
                  <p className="font-medium truncate">{event.summary}</p>
                  <p className="text-[10px] opacity-75">
                    {formatTime(event.start)} - {formatTime(event.end)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
