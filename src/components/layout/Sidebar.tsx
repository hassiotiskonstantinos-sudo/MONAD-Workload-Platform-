'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import clsx from 'clsx';
import {
  Home,
  CheckSquare,
  FolderKanban,
  Package,
  DollarSign,
  Settings,
  Users,
  LogOut,
} from 'lucide-react';
import { signOut } from 'next-auth/react';

const managerNav = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/deliverables', label: 'Deliverables', icon: Package },
  { href: '/financial', label: 'Financial', icon: DollarSign },
  { href: '/people-logs', label: 'People Logs', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isManager = session?.user?.role === 'MANAGER';
  const nav = isManager ? managerNav : [];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-xl font-bold text-brand-700 tracking-tight">MONAD</h1>
        <p className="text-xs text-gray-500 mt-0.5">Workload Platform</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx('nav-link', isActive && 'nav-link-active')}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          {session?.user?.image && (
            <img
              src={session.user.image}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {session?.user?.name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {isManager ? 'Manager' : 'Team Member'}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="nav-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
