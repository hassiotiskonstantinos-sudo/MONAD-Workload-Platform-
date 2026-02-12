'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2, Users } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
}

export default function PeopleLogsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">People Logs</h1>
        <p className="text-sm text-gray-500 mt-1">Historical activity log for each team member</p>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <Link
              key={user.id}
              href={`/people-logs/${user.id}`}
              className="card hover:border-brand-200 transition-colors flex items-center gap-4"
            >
              {user.image ? (
                <img src={user.image} alt="" className="w-12 h-12 rounded-full" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
                  <Users size={20} className="text-brand-600" />
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">{user.name || user.email}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">{user.role.toLowerCase()}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
