'use client';

import clsx from 'clsx';

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  BLOCKED: 'bg-red-100 text-red-700',
  DONE: 'bg-green-100 text-green-700',
  ACTIVE: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-gray-100 text-gray-700',
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_REVIEW: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  PLANNED: 'bg-blue-100 text-blue-700',
};

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  DONE: 'Done',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  CLOSED: 'Closed',
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  DELIVERED: 'Delivered',
  PLANNED: 'Planned',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx('status-badge', STATUS_COLORS[status] || 'bg-gray-100 text-gray-700')}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
