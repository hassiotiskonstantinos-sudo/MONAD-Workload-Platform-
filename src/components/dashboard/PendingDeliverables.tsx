'use client';

import { useEffect, useState } from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { ExternalLink, Loader2 } from 'lucide-react';
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

type Filter = 'week' | 'overdue' | 'month';

export function PendingDeliverables() {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [filter, setFilter] = useState<Filter>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeliverables();
  }, [filter]);

  async function loadDeliverables() {
    setLoading(true);
    let url = '/api/deliverables?pending=true';

    if (filter === 'week') url += '&dueWithin=7';
    else if (filter === 'overdue') url += '&overdue=true';
    else if (filter === 'month') url += '&dueWithin=30';

    try {
      const res = await fetch(url);
      if (res.ok) setDeliverables(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'No date';
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function isOverdue(dateStr: string | null): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Pending Deliverables</h2>
        <div className="flex gap-1">
          {[
            { key: 'week' as Filter, label: 'This Week' },
            { key: 'overdue' as Filter, label: 'Overdue' },
            { key: 'month' as Filter, label: 'Next 30 Days' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-brand-100 text-brand-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      ) : deliverables.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No pending deliverables in this range.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase">
                <th className="pb-2 font-medium">Deliverable</th>
                <th className="pb-2 font-medium">Due</th>
                <th className="pb-2 font-medium">Owner</th>
                <th className="pb-2 font-medium">Project</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Drive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deliverables.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="py-2.5 font-medium text-gray-900">{d.name}</td>
                  <td className={`py-2.5 ${isOverdue(d.dueAt) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                    {formatDate(d.dueAt)}
                  </td>
                  <td className="py-2.5 text-gray-600">
                    {d.owner?.name || d.owner?.email || 'Unassigned'}
                  </td>
                  <td className="py-2.5">
                    {d.project && (
                      <Link href={`/projects/${d.project.id}`} className="text-brand-600 hover:underline">
                        {d.project.name}
                      </Link>
                    )}
                  </td>
                  <td className="py-2.5">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="py-2.5">
                    {d.driveLink && (
                      <a
                        href={d.driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-brand-600"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
