'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';
import { Plus, LogOut, Loader2, Calendar, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
  project: { id: string; name: string } | null;
}

interface WorkloadItem {
  id: string;
  title: string;
  status: string;
  startAt: string;
  endAt: string | null;
  project: { id: string; name: string } | null;
}

interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
}

const TASK_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE'];

export default function LogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workloadItems, setWorkloadItems] = useState<WorkloadItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddWorkload, setShowAddWorkload] = useState(false);
  const [canCreate, setCanCreate] = useState(true);
  const [workloadForm, setWorkloadForm] = useState({ title: '', startAt: '', endAt: '' });

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
    if (session?.user.role === 'MANAGER') router.push('/dashboard');
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user.id) loadData();
  }, [session]);

  async function loadData() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [tasksRes, workloadRes, calRes, userRes] = await Promise.all([
        fetch(`/api/tasks?dueAfter=${today}`),
        fetch('/api/workload'),
        fetch(`/api/calendar?userId=${session!.user.id}&date=${today}`).catch(() => null),
        fetch('/api/users'),
      ]);

      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (workloadRes.ok) setWorkloadItems(await workloadRes.json());
      if (calRes?.ok) {
        const calData = await calRes.json();
        setCalendarEvents(calData.items || []);
      }
      if (userRes.ok) {
        const users = await userRes.json();
        const me = users.find((u: { id: string }) => u.id === session!.user.id);
        if (me) setCanCreate(me.canCreateWorkload);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateTaskStatus(taskId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
        toast.success('Updated');
      }
    } catch {
      toast.error('Failed');
    }
  }

  async function addWorkload(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/workload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: workloadForm.title,
          startAt: workloadForm.startAt || new Date().toISOString(),
          endAt: workloadForm.endAt || null,
        }),
      });
      if (res.ok) {
        toast.success('Added to your workload');
        setShowAddWorkload(false);
        setWorkloadForm({ title: '', startAt: '', endAt: '' });
        loadData();
      }
    } catch {
      toast.error('Failed');
    }
  }

  function formatTime(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function isToday(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const d = new Date(dateStr).toDateString();
    return d === new Date().toDateString();
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!session) return null;

  const todayTasks = tasks.filter((t) => isToday(t.dueAt) || t.status === 'IN_PROGRESS');
  const upcomingTasks = tasks.filter((t) => !isToday(t.dueAt) && t.status !== 'IN_PROGRESS' && t.status !== 'DONE');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-brand-700">MONAD</h1>
            <span className="text-sm text-gray-400">|</span>
            <span className="text-sm text-gray-600">My Log</span>
          </div>
          <div className="flex items-center gap-4">
            {canCreate && (
              <button
                onClick={() => setShowAddWorkload(true)}
                className="btn-primary flex items-center gap-1 text-xs"
              >
                <Plus size={14} /> Add Item
              </button>
            )}
            <div className="flex items-center gap-2">
              {session.user.image && (
                <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
              )}
              <span className="text-sm text-gray-600">{session.user.name}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-gray-400 hover:text-red-500"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Today's Calendar */}
        {calendarEvents.length > 0 && (
          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar size={18} className="text-brand-600" />
              Today&apos;s Schedule
            </h2>
            <div className="space-y-2">
              {calendarEvents.map((event, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50">
                  <div className="text-xs text-gray-500 w-24 flex-shrink-0">
                    {formatTime(event.start)} - {formatTime(event.end)}
                  </div>
                  <span className="text-sm text-gray-900">{event.summary}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* What I'm Doing Today */}
        <section className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckSquare size={18} className="text-brand-600" />
            What I&apos;m Doing Today
          </h2>
          {todayTasks.length === 0 ? (
            <p className="text-sm text-gray-500">No tasks for today.</p>
          ) : (
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg border border-gray-100"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    {task.project && (
                      <p className="text-xs text-gray-500 mt-0.5">{task.project.name}</p>
                    )}
                  </div>
                  <select
                    value={task.status}
                    onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                    className="select w-32 text-xs"
                  >
                    {TASK_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* What's Next */}
        <section className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-3">What&apos;s Next</h2>
          {upcomingTasks.length === 0 && workloadItems.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming items.</p>
          ) : (
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-2 px-3 rounded-lg border border-gray-50">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500">
                      {task.project?.name} &middot; Due {formatDate(task.dueAt)}
                    </p>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))}
              {workloadItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-lg border border-gray-50">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">
                      {item.project?.name || 'Workload item'} &middot; {formatDate(item.startAt)}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Add Workload Modal */}
      <Modal open={showAddWorkload} onClose={() => setShowAddWorkload(false)} title="Add Workload Item">
        <form onSubmit={addWorkload} className="space-y-4">
          <div>
            <label className="label">What are you working on? *</label>
            <input
              className="input"
              value={workloadForm.title}
              onChange={(e) => setWorkloadForm({ ...workloadForm, title: e.target.value })}
              placeholder="e.g., Research for case #123"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start</label>
              <input
                type="datetime-local"
                className="input"
                value={workloadForm.startAt}
                onChange={(e) => setWorkloadForm({ ...workloadForm, startAt: e.target.value })}
              />
            </div>
            <div>
              <label className="label">End</label>
              <input
                type="datetime-local"
                className="input"
                value={workloadForm.endAt}
                onChange={(e) => setWorkloadForm({ ...workloadForm, endAt: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowAddWorkload(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">Add</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
