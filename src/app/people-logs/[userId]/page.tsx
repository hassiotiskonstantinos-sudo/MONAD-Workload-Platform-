'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  timestamp: string;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  actor: { id: string; name: string | null; email: string };
}

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  TASK_CREATED: 'Task assigned',
  TASK_UPDATED: 'Task updated',
  TASK_DELETED: 'Task deleted',
  DELIVERABLE_CREATED: 'Deliverable assigned',
  DELIVERABLE_UPDATED: 'Deliverable updated',
  WORKLOAD_CREATED: 'Workload item added',
  WORKLOAD_UPDATED: 'Workload item updated',
};

export default function PersonLogPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [user, setUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  useEffect(() => {
    loadUser();
  }, [userId]);

  useEffect(() => {
    loadLogs();
  }, [userId, page, dateFrom, dateTo, entityFilter]);

  async function loadUser() {
    const res = await fetch('/api/users');
    if (res.ok) {
      const users = await res.json();
      setUser(users.find((u: User) => u.id === userId) || null);
    }
  }

  async function loadLogs() {
    setLoading(true);
    let url = `/api/audit?userId=${userId}&page=${page}&limit=30`;
    if (dateFrom) url += `&from=${dateFrom}`;
    if (dateTo) url += `&to=${dateTo}`;
    if (entityFilter) url += `&entityType=${entityFilter}`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function formatTimestamp(ts: string): string {
    return new Date(ts).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getChangeDescription(entry: AuditEntry): string {
    const after = entry.afterJson;
    if (!after) return '';

    const title = (after as Record<string, string>).title || (after as Record<string, string>).name || '';
    const status = (after as Record<string, string>).status || '';

    const parts = [];
    if (title) parts.push(title);
    if (status) parts.push(`Status: ${status.replace('_', ' ')}`);

    return parts.join(' - ');
  }

  const totalPages = Math.ceil(total / 30);

  return (
    <AppLayout>
      <div className="mb-6">
        <Link href="/people-logs" className="text-sm text-brand-600 hover:underline flex items-center gap-1 mb-2">
          <ArrowLeft size={14} /> All People
        </Link>
        <div className="flex items-center gap-3">
          {user?.image && <img src={user.image} alt="" className="w-10 h-10 rounded-full" />}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user?.name || user?.email || 'Loading...'}
            </h1>
            <p className="text-sm text-gray-500">Activity History</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div>
          <label className="text-xs text-gray-500">From</label>
          <input
            type="date"
            className="input w-40 ml-1"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">To</label>
          <input
            type="date"
            className="input w-40 ml-1"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Type</label>
          <select
            className="select w-40 ml-1"
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          >
            <option value="">All</option>
            <option value="task">Tasks</option>
            <option value="deliverable">Deliverables</option>
            <option value="workload_item">Workload</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      ) : logs.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No activity logs found for this period.</p>
        </div>
      ) : (
        <div className="card">
          <div className="space-y-0">
            {logs.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex gap-4 py-3 ${i < logs.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <div className="w-2 h-2 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {ACTION_LABELS[entry.action] || entry.action}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {getChangeDescription(entry)}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    by {entry.actor.name || entry.actor.email}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages} ({total} entries)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-xs"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
