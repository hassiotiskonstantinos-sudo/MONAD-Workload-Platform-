'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Deliverable {
  id: string;
  name: string;
  status: string;
  dueAt: string | null;
  driveLink: string | null;
  project: { id: string; name: string } | null;
  milestone: { id: string; name: string } | null;
  owner: { id: string; name: string | null; email: string } | null;
}

export default function DeliverablesPage() {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue'>('pending');

  useEffect(() => {
    loadDeliverables();
  }, [filter]);

  async function loadDeliverables() {
    setLoading(true);
    let url = '/api/deliverables?';
    if (filter === 'pending') url += 'pending=true';
    else if (filter === 'overdue') url += 'overdue=true';

    const res = await fetch(url);
    if (res.ok) setDeliverables(await res.json());
    setLoading(false);
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function isOverdue(dateStr: string | null, status: string): boolean {
    if (!dateStr || status === 'DELIVERED') return false;
    return new Date(dateStr) < new Date();
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deliverables</h1>
          <p className="text-sm text-gray-500 mt-1">Track all project deliverables</p>
        </div>
        <div className="flex gap-1">
          {(['all', 'pending', 'overdue'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Overdue'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      ) : deliverables.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No deliverables found.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="px-6 py-3 font-medium">Deliverable</th>
                <th className="px-6 py-3 font-medium">Due</th>
                <th className="px-6 py-3 font-medium">Owner</th>
                <th className="px-6 py-3 font-medium">Project</th>
                <th className="px-6 py-3 font-medium">Milestone</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Drive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deliverables.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{d.name}</td>
                  <td className={`px-6 py-3 ${isOverdue(d.dueAt, d.status) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                    {formatDate(d.dueAt)}
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {d.owner?.name || d.owner?.email || '-'}
                  </td>
                  <td className="px-6 py-3">
                    {d.project ? (
                      <Link href={`/projects/${d.project.id}`} className="text-brand-600 hover:underline">
                        {d.project.name}
                      </Link>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-3 text-gray-500">{d.milestone?.name || '-'}</td>
                  <td className="px-6 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-6 py-3">
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
        </div>
      )}
    </AppLayout>
  );
}
