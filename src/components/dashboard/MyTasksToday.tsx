'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { StatusBadge } from '../common/StatusBadge';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
  project: { id: string; name: string } | null;
}

const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE'];

export function MyTasksToday() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user.id) loadTasks();
  }, [session]);

  async function loadTasks() {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    try {
      const res = await fetch(
        `/api/tasks?assigneeId=${session!.user.id}&dueAfter=${today}&dueBefore=${tomorrow}`
      );
      if (res.ok) setTasks(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(taskId: string, status: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
        toast.success('Status updated');
      }
    } catch {
      toast.error('Failed to update');
    }
  }

  function formatDue(dateStr: string | null): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (loading) {
    return (
      <section className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">My Tasks Today</h2>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">My Tasks Today</h2>
        <Link href="/tasks" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
          View all
        </Link>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No tasks due today.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-4 px-4 py-3 rounded-lg border border-gray-100 hover:bg-gray-50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {task.project && (
                    <Link
                      href={`/projects/${task.project.id}`}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      {task.project.name}
                    </Link>
                  )}
                  {task.dueAt && (
                    <span className="text-xs text-gray-400">Due {formatDue(task.dueAt)}</span>
                  )}
                </div>
              </div>

              <select
                value={task.status}
                onChange={(e) => updateStatus(task.id, e.target.value)}
                className="select w-36 text-xs"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
