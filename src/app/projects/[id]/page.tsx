'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';
import {
  Loader2,
  ExternalLink,
  FolderPlus,
  Plus,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface ProjectDetail {
  id: string;
  name: string;
  client: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  driveFolderId: string | null;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    dueAt: string | null;
    assignee: { id: string; name: string | null; email: string } | null;
  }>;
  milestones: Array<{
    id: string;
    name: string;
    dueAt: string | null;
    deliverables: Array<{
      id: string;
      name: string;
      status: string;
      dueAt: string | null;
      owner: { name: string | null; email: string } | null;
    }>;
  }>;
  deliverables: Array<{
    id: string;
    name: string;
    status: string;
    dueAt: string | null;
    driveLink: string | null;
    owner: { name: string | null; email: string } | null;
    milestone: { id: string; name: string } | null;
  }>;
  financial: {
    budget: number | null;
    invoiced: number | null;
    collected: number | null;
    costs: number | null;
    notes: string | null;
  } | null;
  financialDocs: Array<{ id: string; title: string; driveLink: string }>;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
}

type Tab = 'overview' | 'tasks' | 'milestones' | 'deliverables' | 'drive' | 'financial';

export default function ProjectDetailPage() {
  const params = useParams();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showAddDeliverable, setShowAddDeliverable] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ name: '', dueAt: '', description: '' });
  const [deliverableForm, setDeliverableForm] = useState({
    name: '', dueAt: '', ownerId: '', milestoneId: '', driveLink: '',
  });
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [financialForm, setFinancialForm] = useState({
    budget: '', invoiced: '', collected: '', costs: '', notes: '',
  });

  useEffect(() => {
    loadProject();
    loadUsers();
  }, [params.id]);

  async function loadProject() {
    try {
      const res = await fetch(`/api/projects/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        if (data.financial) {
          setFinancialForm({
            budget: data.financial.budget?.toString() || '',
            invoiced: data.financial.invoiced?.toString() || '',
            collected: data.financial.collected?.toString() || '',
            costs: data.financial.costs?.toString() || '',
            notes: data.financial.notes || '',
          });
        }
        if (data.driveFolderId) loadDriveFiles(data.driveFolderId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    const res = await fetch('/api/users');
    if (res.ok) setUsers(await res.json());
  }

  async function loadDriveFiles(folderId: string) {
    const res = await fetch(`/api/drive?folderId=${folderId}`);
    if (res.ok) setDriveFiles(await res.json());
  }

  async function createDriveFolder() {
    if (!project) return;
    const res = await fetch('/api/drive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project.id, projectName: project.name }),
    });
    if (res.ok) {
      toast.success('Drive folder created');
      loadProject();
    } else {
      toast.error('Failed to create folder');
    }
  }

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...milestoneForm,
        projectId: params.id,
        dueAt: milestoneForm.dueAt || null,
      }),
    });
    if (res.ok) {
      toast.success('Milestone added');
      setShowAddMilestone(false);
      setMilestoneForm({ name: '', dueAt: '', description: '' });
      loadProject();
    }
  }

  async function addDeliverable(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/deliverables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...deliverableForm,
        projectId: params.id,
        ownerId: deliverableForm.ownerId || null,
        milestoneId: deliverableForm.milestoneId || null,
        dueAt: deliverableForm.dueAt || null,
        driveLink: deliverableForm.driveLink || null,
      }),
    });
    if (res.ok) {
      toast.success('Deliverable added');
      setShowAddDeliverable(false);
      setDeliverableForm({ name: '', dueAt: '', ownerId: '', milestoneId: '', driveLink: '' });
      loadProject();
    }
  }

  async function saveFinancials() {
    const res = await fetch('/api/financial', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: params.id,
        budget: financialForm.budget ? parseFloat(financialForm.budget) : null,
        invoiced: financialForm.invoiced ? parseFloat(financialForm.invoiced) : null,
        collected: financialForm.collected ? parseFloat(financialForm.collected) : null,
        costs: financialForm.costs ? parseFloat(financialForm.costs) : null,
        notes: financialForm.notes || null,
      }),
    });
    if (res.ok) toast.success('Financial data saved');
    else toast.error('Failed to save');
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatCurrency(val: number | null): string {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <p className="text-gray-500 py-12 text-center">Project not found.</p>
      </AppLayout>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'tasks', label: `Tasks (${project.tasks.length})` },
    { key: 'milestones', label: `Milestones (${project.milestones.length})` },
    { key: 'deliverables', label: `Deliverables (${project.deliverables.length})` },
    { key: 'drive', label: 'Drive' },
    { key: 'financial', label: 'Financial' },
  ];

  return (
    <AppLayout>
      <div className="mb-6">
        <Link href="/projects" className="text-sm text-brand-600 hover:underline mb-2 inline-block">
          &larr; All Projects
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <StatusBadge status={project.status} />
        </div>
        {project.client && <p className="text-sm text-gray-500 mt-1">Client: {project.client}</p>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Project Info</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd><StatusBadge status={project.status} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Start Date</dt>
                <dd className="text-gray-900">{formatDate(project.startDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">End Date</dt>
                <dd className="text-gray-900">{formatDate(project.endDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Tasks</dt>
                <dd className="text-gray-900">{project.tasks.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Deliverables</dt>
                <dd className="text-gray-900">{project.deliverables.length}</dd>
              </div>
            </dl>
          </div>

          {/* Simple timeline */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Timeline</h3>
            <div className="space-y-3">
              {project.startDate && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={14} className="text-green-500" />
                  <span className="text-gray-600">Start: {formatDate(project.startDate)}</span>
                </div>
              )}
              {project.milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-3 text-sm">
                  <div className="w-3.5 h-3.5 rounded-full bg-brand-200 border-2 border-brand-500" />
                  <span className="text-gray-900 font-medium">{m.name}</span>
                  <span className="text-gray-400 text-xs">{formatDate(m.dueAt)}</span>
                </div>
              ))}
              {project.endDate && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={14} className="text-red-500" />
                  <span className="text-gray-600">End: {formatDate(project.endDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Project Tasks</h3>
            <Link href={`/tasks?projectId=${project.id}`} className="text-sm text-brand-600">
              Manage in Tasks
            </Link>
          </div>
          {project.tasks.length === 0 ? (
            <p className="text-sm text-gray-500">No tasks yet.</p>
          ) : (
            <div className="space-y-2">
              {project.tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{t.title}</p>
                    <p className="text-xs text-gray-500">
                      {t.assignee?.name || 'Unassigned'} &middot; {formatDate(t.dueAt)}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Milestones</h3>
            <button onClick={() => setShowAddMilestone(true)} className="btn-primary flex items-center gap-1 text-xs">
              <Plus size={14} /> Add Milestone
            </button>
          </div>
          {project.milestones.length === 0 ? (
            <p className="text-sm text-gray-500">No milestones yet.</p>
          ) : (
            <div className="space-y-4">
              {project.milestones.map((m) => (
                <div key={m.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{m.name}</h4>
                    <span className="text-xs text-gray-500">{formatDate(m.dueAt)}</span>
                  </div>
                  {m.deliverables.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {m.deliverables.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="truncate">{d.name}</span>
                          <StatusBadge status={d.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'deliverables' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Deliverables</h3>
            <button onClick={() => setShowAddDeliverable(true)} className="btn-primary flex items-center gap-1 text-xs">
              <Plus size={14} /> Add Deliverable
            </button>
          </div>
          {project.deliverables.length === 0 ? (
            <p className="text-sm text-gray-500">No deliverables yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Due</th>
                  <th className="pb-2 font-medium">Owner</th>
                  <th className="pb-2 font-medium">Milestone</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Drive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {project.deliverables.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2 font-medium text-gray-900">{d.name}</td>
                    <td className="py-2 text-gray-600">{formatDate(d.dueAt)}</td>
                    <td className="py-2 text-gray-600">{d.owner?.name || d.owner?.email || '-'}</td>
                    <td className="py-2 text-gray-500">{d.milestone?.name || '-'}</td>
                    <td className="py-2"><StatusBadge status={d.status} /></td>
                    <td className="py-2">
                      {d.driveLink && (
                        <a href={d.driveLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={14} className="text-gray-400 hover:text-brand-600" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'drive' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Google Drive</h3>
            {!project.driveFolderId && (
              <button onClick={createDriveFolder} className="btn-primary flex items-center gap-1 text-xs">
                <FolderPlus size={14} /> Create Project Folder
              </button>
            )}
          </div>
          {project.driveFolderId ? (
            <>
              <a
                href={`https://drive.google.com/drive/folders/${project.driveFolderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-600 hover:underline mb-4 inline-block"
              >
                Open folder in Drive &rarr;
              </a>
              {driveFiles.length > 0 ? (
                <div className="space-y-2">
                  {driveFiles.map((f) => (
                    <a
                      key={f.id}
                      href={f.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      <ExternalLink size={14} className="text-gray-400" />
                      <span className="text-gray-900">{f.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(f.modifiedTime).toLocaleDateString()}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No files in project folder yet.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">
              No Drive folder linked. Create one or paste a folder ID in project settings.
            </p>
          )}
        </div>
      )}

      {activeTab === 'financial' && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Financial Overview</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="label">Budget</label>
              <input
                type="number"
                className="input"
                placeholder="0.00"
                value={financialForm.budget}
                onChange={(e) => setFinancialForm({ ...financialForm, budget: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Invoiced</label>
              <input
                type="number"
                className="input"
                placeholder="0.00"
                value={financialForm.invoiced}
                onChange={(e) => setFinancialForm({ ...financialForm, invoiced: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Collected</label>
              <input
                type="number"
                className="input"
                placeholder="0.00"
                value={financialForm.collected}
                onChange={(e) => setFinancialForm({ ...financialForm, collected: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Costs</label>
              <input
                type="number"
                className="input"
                placeholder="0.00"
                value={financialForm.costs}
                onChange={(e) => setFinancialForm({ ...financialForm, costs: e.target.value })}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={3}
              value={financialForm.notes}
              onChange={(e) => setFinancialForm({ ...financialForm, notes: e.target.value })}
            />
          </div>
          <button onClick={saveFinancials} className="btn-primary">
            Save Financial Data
          </button>

          {project.financialDocs.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Financial Documents</h4>
              {project.financialDocs.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-brand-600 hover:underline py-1"
                >
                  <ExternalLink size={12} /> {doc.title}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Milestone Modal */}
      <Modal open={showAddMilestone} onClose={() => setShowAddMilestone(false)} title="Add Milestone">
        <form onSubmit={addMilestone} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              value={milestoneForm.name}
              onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Due Date</label>
            <input
              type="date"
              className="input"
              value={milestoneForm.dueAt}
              onChange={(e) => setMilestoneForm({ ...milestoneForm, dueAt: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={2}
              value={milestoneForm.description}
              onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowAddMilestone(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add</button>
          </div>
        </form>
      </Modal>

      {/* Add Deliverable Modal */}
      <Modal open={showAddDeliverable} onClose={() => setShowAddDeliverable(false)} title="Add Deliverable" wide>
        <form onSubmit={addDeliverable} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              value={deliverableForm.name}
              onChange={(e) => setDeliverableForm({ ...deliverableForm, name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Owner</label>
              <select
                className="select"
                value={deliverableForm.ownerId}
                onChange={(e) => setDeliverableForm({ ...deliverableForm, ownerId: e.target.value })}
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
                type="date"
                className="input"
                value={deliverableForm.dueAt}
                onChange={(e) => setDeliverableForm({ ...deliverableForm, dueAt: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Milestone</label>
              <select
                className="select"
                value={deliverableForm.milestoneId}
                onChange={(e) => setDeliverableForm({ ...deliverableForm, milestoneId: e.target.value })}
              >
                <option value="">None</option>
                {project.milestones.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Drive Link</label>
              <input
                className="input"
                placeholder="https://drive.google.com/..."
                value={deliverableForm.driveLink}
                onChange={(e) => setDeliverableForm({ ...deliverableForm, driveLink: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowAddDeliverable(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add</button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
