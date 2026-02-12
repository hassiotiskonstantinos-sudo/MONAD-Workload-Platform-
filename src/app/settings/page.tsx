'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  workloadCalendarId: string | null;
  canCreateWorkload: boolean;
  logFutureWindowDays: number;
  showEventTitles: boolean;
}

export default function SettingsPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const res = await fetch('/api/users');
      if (res.ok) setMembers(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(userId: string, data: Partial<TeamMember>) {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data }),
      });
      if (res.ok) {
        toast.success('Updated');
        loadMembers();
      } else {
        toast.error('Failed to update');
      }
    } catch {
      toast.error('Failed');
    }
  }

  async function createCalendar(userId: string) {
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createWorkloadCalendar', userId }),
      });
      if (res.ok) {
        toast.success('Workload calendar created');
        loadMembers();
      } else {
        toast.error('Failed to create calendar');
      }
    } catch {
      toast.error('Failed');
    }
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage team configuration and permissions</p>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h2>
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="border border-gray-100 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900">{member.name || member.email}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                    <span className={`status-badge ${member.role === 'MANAGER' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                      {member.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={member.canCreateWorkload}
                          onChange={(e) =>
                            updateUser(member.id, { canCreateWorkload: e.target.checked })
                          }
                          className="rounded border-gray-300"
                        />
                        <span className="text-gray-700">Can create workload items</span>
                      </label>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={member.showEventTitles}
                          onChange={(e) =>
                            updateUser(member.id, { showEventTitles: e.target.checked })
                          }
                          className="rounded border-gray-300"
                        />
                        <span className="text-gray-700">Show event titles</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-gray-700">Log window (days):</label>
                      <input
                        type="number"
                        min={7}
                        max={90}
                        className="input w-20"
                        value={member.logFutureWindowDays}
                        onChange={(e) =>
                          updateUser(member.id, {
                            logFutureWindowDays: parseInt(e.target.value) || 30,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    {member.workloadCalendarId ? (
                      <span className="text-xs text-green-600">
                        Workload calendar connected
                      </span>
                    ) : (
                      <button
                        onClick={() => createCalendar(member.id)}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Create workload calendar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Google Integration Info</h2>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>Calendar scopes:</strong> Read/write events to manage workload calendars.
              </p>
              <p>
                <strong>Drive scopes:</strong> Create folders and read file metadata for project files.
              </p>
              <p>
                <strong>Privacy:</strong> When &quot;Show event titles&quot; is off, only free/busy blocks
                are visible to the manager.
              </p>
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
