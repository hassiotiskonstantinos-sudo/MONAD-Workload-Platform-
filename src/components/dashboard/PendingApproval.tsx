'use client';

import { useEffect, useState } from 'react';
import { Check, X, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface PendingTask {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: string;
  assignee: { id: string; name: string | null; email: string } | null;
  project: { id: string; name: string } | null;
  createdBy: { id: string; name: string | null; email: string };
  createdAt: string;
}

export function PendingApproval() {
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadPending();
  }, []);

  async function loadPending() {
    try {
      const res = await fetch('/api/tasks?pending=true');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  async function approveTask(taskId: string) {
    setActionLoading(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/approve`, { method: 'POST' });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        toast.success('Task approved & synced to calendar');
      } else {
        toast.error('Failed to approve');
      }
    } catch {
      toast.error('Failed to approve');
    } finally {
      setActionLoading(null);
    }
  }

  async function rejectTask(taskId: string) {
    setActionLoading(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        toast.success('Task rejected');
      } else {
        toast.error('Failed to reject');
      }
    } catch {
      toast.error('Failed to reject');
    } finally {
      setActionLoading(null);
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'No due date';
    return new Date(dateStr).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <section className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock size={18} className="text-amber-500" />
          Pending Approval
        </h2>
        <div className="flex justify-center py-4">
          <Loader2 className="animate-spin text-gray-400" size={20} />
        </div>
      </section>
    );
  }

  if (tasks.length === 0) return null;

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Clock size={18} className="text-amber-500" />
          Pending Approval
          <span className="ml-1 bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </h2>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-3 py-3 px-4 rounded-lg border border-amber-100 bg-amber-50/50"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{task.title}</p>
              {task.description && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs text-gray-500">
                  by {task.assignee?.name || task.assignee?.email || 'Unknown'}
                </span>
                {task.project && (
                  <span className="text-xs text-gray-400">{task.project.name}</span>
                )}
                <span className="text-xs text-gray-400">Due: {formatDate(task.dueAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {actionLoading === task.id ? (
                <Loader2 className="animate-spin text-gray-400" size={16} />
              ) : (
                <>
                  <button
                    onClick={() => approveTask(task.id)}
                    className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                    title="Approve"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => rejectTask(task.id)}
                    className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    title="Reject"
                  >
                    <X size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
