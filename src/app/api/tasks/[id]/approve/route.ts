import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireManager, jsonOk, jsonError } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';
import { createCalendarEvent } from '@/lib/google-calendar';

// POST /api/tasks/:id/approve — manager approves a pending task
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  if (!task) return jsonError('Not found', 404);
  if (!task.pending) return jsonError('Task is not pending approval');

  // Approve: set pending to false
  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { pending: false },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
  });

  // Now sync to calendar since task is approved
  if (updated.assigneeId && updated.dueAt) {
    const eventId = await createCalendarEvent(updated.assigneeId, {
      title: updated.title,
      description: `Task: ${updated.title}${updated.project ? ` | Project: ${updated.project.name}` : ''}`,
      startTime: updated.dueAt.toISOString(),
      allDay: true,
    });

    if (eventId) {
      await prisma.task.update({
        where: { id: task.id },
        data: { calendarEventId: eventId },
      });
    }
  }

  await logAudit({
    actorId: session!.user.id,
    subjectUserId: task.assigneeId || undefined,
    action: 'TASK_APPROVED',
    entityType: 'task',
    entityId: task.id,
    before: { pending: true },
    after: { pending: false },
  });

  return jsonOk(updated);
}
