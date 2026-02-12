'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import { Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Project {
  id: string;
  name: string;
  client: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  _count: { tasks: number; deliverables: number; milestones: number };
  financial: { budget: number | null; invoiced: number | null; collected: number | null } | null;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    client: '',
    status: 'ACTIVE',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) setProjects(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          client: form.client || null,
          status: form.status,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
        }),
      });
      if (res.ok) {
        toast.success('Project created');
        setShowCreate(false);
        setForm({ name: '', client: '', status: 'ACTIVE', startDate: '', endDate: '' });
        loadProjects();
      }
    } catch {
      toast.error('Failed to create project');
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage project portfolio</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Project
        </button>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      ) : projects.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No projects yet"
            description="Create your first project to start tracking work"
            action={
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                Create Project
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="card hover:border-brand-200 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{project.name}</h3>
                  {project.client && (
                    <p className="text-xs text-gray-500 mt-0.5">{project.client}</p>
                  )}
                </div>
                <StatusBadge status={project.status} />
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                <span>{formatDate(project.startDate)} - {formatDate(project.endDate)}</span>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-500">
                  <strong className="text-gray-700">{project._count.tasks}</strong> tasks
                </span>
                <span className="text-gray-500">
                  <strong className="text-gray-700">{project._count.deliverables}</strong> deliverables
                </span>
                <span className="text-gray-500">
                  <strong className="text-gray-700">{project._count.milestones}</strong> milestones
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <form onSubmit={createProject} className="space-y-4">
          <div>
            <label className="label">Project Name *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Client</label>
            <input
              className="input"
              value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Project
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
