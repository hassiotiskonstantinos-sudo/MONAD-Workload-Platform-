'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { SearchBar } from '../common/SearchBar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  const isManager = session.user.role === 'MANAGER';

  // Members only see the Log page - no sidebar
  if (!isManager) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-brand-700">MONAD</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{session.user.name}</span>
            {session.user.image && (
              <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
            )}
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <SearchBar />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{session.user.name}</span>
            {session.user.image && (
              <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
            )}
          </div>
        </header>
        <main className="px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
