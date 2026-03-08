'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { TeamToday } from '@/components/dashboard/TeamToday';
import { MyTasksToday } from '@/components/dashboard/MyTasksToday';
import { PendingDeliverables } from '@/components/dashboard/PendingDeliverables';
import { PendingApproval } from '@/components/dashboard/PendingApproval';

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your team&apos;s workload today</p>
      </div>

      <div className="space-y-8">
        <PendingApproval />
        <TeamToday />
        <MyTasksToday />
        <PendingDeliverables />
      </div>
    </AppLayout>
  );
}
