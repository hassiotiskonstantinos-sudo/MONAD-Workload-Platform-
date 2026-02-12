'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import { Plus, Loader2, Filter } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueAt: string | null;
  tags: string[];
  assignee: { id: string; name: string | null; email: string } | null;
  project: { id: string; name: string } | null;
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE'];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'NOT_STARTED',
    dueAt: '',
    assigneeId: '',
    projectId: '',
    driveLink: '',
  });

  useEffect(() => {
    loadData();
  }, [filterStatus, filterAssignee]);

  async function loadData() {
    setLoading(true);
    let url = '/api/tasks?';
    if (filterStatus) url += `status=${filterStatus}&`;
    if (filterAssignee) url += `assigneeId=${filterAssignee}&`;

    try {
      const [tasksRes, usersRes, projectsRes] = await Promise.all([
        fetch(url),
        fetch('/api/users'),
        fetch('/api/projects'),
      ]);

      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          dueAt: form.dueAt || null,
          assigneeId: form.assigneeId || null,
          projectId: form.projectId || null,
          driveLink: form.driveLink || null,
        }),
      });

      if (res.ok) {
        toast.success('Task created');
        setShowCreate(false);
        setForm({ title: '', description: '', status: 'NOT_STARTED', dueAt: '', assigneeId: '', projectId: '', driveLink: '' });
        loadData();
      } else {
        toast.error('Failed to create task');
      }
    } catch {
      toast.error('Failed to create task');
    }
  }

  async function updateTaskStatus(taskId: string, status: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
        toast.success('Updated');
      }
    } catch {
      toast.error('Failed');
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track all team tasks</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Filter size={16} className="text-gray-400" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="select w-40"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="select w-48"
        >
          <option value="">All assignees</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name || u.email}</option>
          ))}
        </select>
      </div>

      {/* Tasks list */}
      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      ) : tasks.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No tasks found"
            description="Create your first task to get started"
            action={
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                Create Task
              </button>
            }
          />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="px-6 py-3 font-medium">Task</th>
                <th className="px-6 py-3 font-medium">Assignee</th>
                <th className="px-6 py-3 font-medium">Project</th>
                <th className="px-6 py-3 font-medium">Due</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-900">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{task.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {task.assignee?.name || task.assignee?.email || 'Unassigned'}
                  </td>
                  <td className="px-6 py-3">
                    {task.project ? (
                      <Link href={`/projects/${task.project.id}`} className="text-brand-600 hover:underline">
                        {task.project.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(task.dueAt)}</td>
                  <td className="px-6 py-3">
                    <select
                      value={task.status}
                      onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                      className="select w-32 text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Task" wide>
        <form onSubmit={createTask} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Assignee</label>
              <select
                className="select"
                value={form.assigneeId}
                onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input
                type="datetime-local"
                className="input"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Project</label>
              <select
                className="select"
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Drive Link</label>
            <input
              className="input"
              placeholder="https://drive.google.com/..."
              value={form.driveLink}
              onChange={(e) => setForm({ ...form, driveLink: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Task
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
