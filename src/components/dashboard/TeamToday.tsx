'use client';

import { useEffect, useState } from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { Calendar, Mail, ClipboardList, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface CalendarEvent {
  id?: string;
  summary: string;
  start: string;
  end: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
}

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export function TeamToday() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [calendarData, setCalendarData] = useState<Record<string, CalendarEvent[]>>({});
  const [taskData, setTaskData] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const usersRes = await fetch('/api/users');
      const users: TeamMember[] = await usersRes.json();
      setMembers(users.filter((u) => u.id));

      // Load calendar and tasks for each member
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const calPromises = users.map(async (u) => {
        try {
          const res = await fetch(`/api/calendar?userId=${u.id}&date=${today}`);
          const data = await res.json();
          return { userId: u.id, events: data.items || [] };
        } catch {
          return { userId: u.id, events: [] };
        }
      });

      const taskPromises = users.map(async (u) => {
        try {
          const res = await fetch(
            `/api/tasks?assigneeId=${u.id}&dueAfter=${today}&dueBefore=${tomorrow}`
          );
          const data = await res.json();
          return { userId: u.id, tasks: data || [] };
        } catch {
          return { userId: u.id, tasks: [] };
        }
      });

      const calResults = await Promise.all(calPromises);
      const taskResults = await Promise.all(taskPromises);

      const calMap: Record<string, CalendarEvent[]> = {};
      calResults.forEach((r) => (calMap[r.userId] = r.events));
      setCalendarData(calMap);

      const taskMap: Record<string, Task[]> = {};
      taskResults.forEach((r) => (taskMap[r.userId] = r.tasks));
      setTaskData(taskMap);
    } catch (err) {
      console.error('Failed to load team data', err);
    } finally {
      setLoading(false);
    }
  }

  function getCurrentFocus(userId: string): string {
    const tasks = taskData[userId] || [];
    const inProgress = tasks.find((t) => t.status === 'IN_PROGRESS');
    if (inProgress) return inProgress.title;

    const events = calendarData[userId] || [];
    const now = new Date();
    const current = events.find((e) => {
      const start = new Date(e.start);
      const end = new Date(e.end);
      return start <= now && end >= now;
    });
    if (current) return current.summary;

    return 'No active focus';
  }

  function formatTime(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  if (loading) {
    return (
      <section className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Today</h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Today</h2>

      {members.length === 0 ? (
        <p className="text-sm text-gray-500">No team members found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const events = calendarData[member.id] || [];
            const tasks = taskData[member.id] || [];
            const focus = getCurrentFocus(member.id);

            return (
              <div
                key={member.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-brand-200 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  {member.image ? (
                    <img src={member.image} alt="" className="w-9 h-9 rounded-full" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-medium text-sm">
                      {(member.name || member.email)[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {member.name || member.email}
                    </p>
                    <p className="text-xs text-brand-600 truncate">{focus}</p>
                  </div>
                </div>

                {/* Calendar blocks */}
                {events.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-400 uppercase mb-1">Calendar</p>
                    <div className="space-y-1">
                      {events.slice(0, 4).map((e, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                          <Calendar size={12} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate">{e.summary}</span>
                          <span className="text-gray-400 ml-auto whitespace-nowrap">
                            {formatTime(e.start)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tasks due today */}
                {tasks.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-400 uppercase mb-1">Tasks</p>
                    <div className="space-y-1">
                      {tasks.slice(0, 3).map((t) => (
                        <div key={t.id} className="flex items-center gap-2 text-xs">
                          <ClipboardList size={12} className="text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700 truncate">{t.title}</span>
                          <StatusBadge status={t.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {events.length === 0 && tasks.length === 0 && (
                  <p className="text-xs text-gray-400 mb-3">No calendar or tasks today</p>
                )}

                {/* Quick actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <Link
                    href={`/tasks?assign=${member.id}`}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Assign Task
                  </Link>
                  <a
                    href={`mailto:${member.email}`}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
                  >
                    <Mail size={11} /> Message
                  </a>
                  <Link
                    href={`/people-logs/${member.id}`}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium ml-auto"
                  >
                    History
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
