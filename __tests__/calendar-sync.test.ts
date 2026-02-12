import { describe, test, expect } from '@jest/globals';

/**
 * Calendar Sync Logic Tests
 *
 * Tests the business logic for calendar event creation and updates,
 * without requiring actual Google API credentials.
 */

const CALENDAR_PREFIX = '[MONAD]';

describe('Calendar: Event title formatting', () => {
  function formatEventTitle(title: string, done: boolean = false): string {
    return done
      ? `${CALENDAR_PREFIX} [DONE] ${title}`
      : `${CALENDAR_PREFIX} ${title}`;
  }

  test('formats regular task title', () => {
    expect(formatEventTitle('Review contract')).toBe('[MONAD] Review contract');
  });

  test('formats completed task title', () => {
    expect(formatEventTitle('Review contract', true)).toBe(
      '[MONAD] [DONE] Review contract'
    );
  });

  test('formats deliverable title', () => {
    expect(formatEventTitle('Deliverable: Final report')).toBe(
      '[MONAD] Deliverable: Final report'
    );
  });
});

describe('Calendar: Event parameters for tasks', () => {
  interface TaskCalendarParams {
    title: string;
    description?: string;
    startTime: string;
    endTime?: string;
    allDay?: boolean;
  }

  function buildTaskCalendarParams(task: {
    title: string;
    dueAt: string;
    projectName?: string;
  }): TaskCalendarParams {
    return {
      title: task.title,
      description: `Task: ${task.title}${task.projectName ? ` | Project: ${task.projectName}` : ''}`,
      startTime: task.dueAt,
      allDay: true,
    };
  }

  test('creates all-day event for task with due date', () => {
    const params = buildTaskCalendarParams({
      title: 'Review docs',
      dueAt: '2024-06-15T00:00:00Z',
    });

    expect(params.allDay).toBe(true);
    expect(params.title).toBe('Review docs');
    expect(params.description).toBe('Task: Review docs');
  });

  test('includes project name in description', () => {
    const params = buildTaskCalendarParams({
      title: 'Draft brief',
      dueAt: '2024-06-15T00:00:00Z',
      projectName: 'Smith vs Jones',
    });

    expect(params.description).toBe('Task: Draft brief | Project: Smith vs Jones');
  });
});

describe('Calendar: Event parameters for deliverables', () => {
  function buildDeliverableCalendarParams(deliverable: {
    name: string;
    dueAt: string;
    projectName: string;
  }) {
    return {
      title: `Deliverable: ${deliverable.name}`,
      description: `Deliverable for project: ${deliverable.projectName}`,
      startTime: deliverable.dueAt,
      allDay: true,
    };
  }

  test('creates event for deliverable', () => {
    const params = buildDeliverableCalendarParams({
      name: 'Final Report',
      dueAt: '2024-07-01T00:00:00Z',
      projectName: 'Case #123',
    });

    expect(params.title).toBe('Deliverable: Final Report');
    expect(params.description).toBe('Deliverable for project: Case #123');
    expect(params.allDay).toBe(true);
  });
});

describe('Calendar: Update event on status change', () => {
  function shouldMarkDone(
    oldStatus: string,
    newStatus: string
  ): { updateCalendar: boolean; markDone: boolean } {
    if (oldStatus === newStatus) return { updateCalendar: false, markDone: false };
    if (newStatus === 'DONE') return { updateCalendar: true, markDone: true };
    if (oldStatus === 'DONE') return { updateCalendar: true, markDone: false };
    return { updateCalendar: false, markDone: false };
  }

  test('marks done when task completed', () => {
    const result = shouldMarkDone('IN_PROGRESS', 'DONE');
    expect(result.updateCalendar).toBe(true);
    expect(result.markDone).toBe(true);
  });

  test('removes done when task reopened', () => {
    const result = shouldMarkDone('DONE', 'IN_PROGRESS');
    expect(result.updateCalendar).toBe(true);
    expect(result.markDone).toBe(false);
  });

  test('no calendar update for non-completion status change', () => {
    const result = shouldMarkDone('NOT_STARTED', 'IN_PROGRESS');
    expect(result.updateCalendar).toBe(false);
  });

  test('no update for same status', () => {
    const result = shouldMarkDone('IN_PROGRESS', 'IN_PROGRESS');
    expect(result.updateCalendar).toBe(false);
  });
});

describe('Calendar: Date change detection', () => {
  function hasDateChanged(
    oldDate: string | null,
    newDate: string | null
  ): boolean {
    if (!oldDate && !newDate) return false;
    if (!oldDate || !newDate) return true;
    return new Date(oldDate).getTime() !== new Date(newDate).getTime();
  }

  test('detects date change', () => {
    expect(hasDateChanged('2024-06-15', '2024-06-20')).toBe(true);
  });

  test('detects no change for same date', () => {
    expect(hasDateChanged('2024-06-15', '2024-06-15')).toBe(false);
  });

  test('detects change from null to date', () => {
    expect(hasDateChanged(null, '2024-06-15')).toBe(true);
  });

  test('detects change from date to null', () => {
    expect(hasDateChanged('2024-06-15', null)).toBe(true);
  });

  test('no change for both null', () => {
    expect(hasDateChanged(null, null)).toBe(false);
  });
});

describe('Calendar: Workload item calendar params', () => {
  function buildWorkloadCalendarParams(item: {
    title: string;
    startAt: string;
    endAt: string | null;
    projectName?: string;
  }) {
    return {
      title: item.title,
      description: item.projectName ? `Project: ${item.projectName}` : undefined,
      startTime: item.startAt,
      endTime: item.endAt || undefined,
      allDay: !item.endAt,
    };
  }

  test('creates all-day event when no end time', () => {
    const params = buildWorkloadCalendarParams({
      title: 'Client meeting prep',
      startAt: '2024-06-15T00:00:00Z',
      endAt: null,
    });

    expect(params.allDay).toBe(true);
    expect(params.endTime).toBeUndefined();
  });

  test('creates timed event with start and end', () => {
    const params = buildWorkloadCalendarParams({
      title: 'Client meeting',
      startAt: '2024-06-15T09:00:00Z',
      endAt: '2024-06-15T10:00:00Z',
    });

    expect(params.allDay).toBe(false);
    expect(params.endTime).toBe('2024-06-15T10:00:00Z');
  });
});
