import { NextRequest } from 'next/server';
import { getSession, requireAuth, jsonOk, jsonError } from '@/lib/api-utils';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// POST /api/calendar/sync — create/update/delete calendar events for tasks and deliverables
export async function POST(req: NextRequest) {
  const session = await getSession();
  const authErr = requireAuth(session);
  if (authErr) return authErr;

  const body = await req.json();
  const { action, entityType, entityId } = body;

  if (!action || !entityType || !entityId) {
    return jsonError('action, entityType, and entityId are required');
  }

  if (entityType === 'task') {
    const task = await prisma.task.findUnique({
      where: { id: entityId },
      include: { project: { select: { name: true } } },
    });

    if (!task) return jsonError('Task not found', 404);
    if (!task.assigneeId) return jsonError('Task has no assignee');

    // Members can only sync their own tasks
    const isManager = session!.user.role === UserRole.MANAGER;
    if (!isManager && task.assigneeId !== session!.user.id) {
      return jsonError('Forbidden', 403);
    }

    // Don't sync pending (unapproved) tasks
    if (task.pending) {
      return jsonOk({ skipped: true, reason: 'Task is pending approval' });
    }

    if (action === 'create' && task.dueAt) {
      const eventId = await createCalendarEvent(task.assigneeId, {
        title: task.title,
        description: `Task: ${task.title}${task.project ? ` | Project: ${task.project.name}` : ''}`,
        startTime: task.dueAt.toISOString(),
        allDay: true,
      });

      if (eventId) {
        await prisma.task.update({
          where: { id: task.id },
          data: { calendarEventId: eventId },
        });
        return jsonOk({ eventId });
      }
      return jsonError('Calendar sync failed — user may not have connected Google Calendar');
    }

    if (action === 'update' && task.calendarEventId) {
      const isDone = task.status === 'DONE';
      const success = await updateCalendarEvent(task.assigneeId, task.calendarEventId, {
        title: task.title,
        startTime: task.dueAt?.toISOString(),
        allDay: true,
        done: isDone,
      });
      return success ? jsonOk({ updated: true }) : jsonError('Calendar update failed');
    }

    if (action === 'delete' && task.calendarEventId) {
      const success = await deleteCalendarEvent(task.assigneeId, task.calendarEventId);
      if (success) {
        await prisma.task.update({
          where: { id: task.id },
          data: { calendarEventId: null },
        });
      }
      return success ? jsonOk({ deleted: true }) : jsonError('Calendar delete failed');
    }

    return jsonOk({ skipped: true, reason: 'No action needed' });
  }

  if (entityType === 'deliverable') {
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: entityId },
      include: { project: { select: { name: true } } },
    });

    if (!deliverable) return jsonError('Deliverable not found', 404);
    if (!deliverable.ownerId) return jsonError('Deliverable has no owner');

    if (action === 'create' && deliverable.dueAt) {
      const eventId = await createCalendarEvent(deliverable.ownerId, {
        title: deliverable.name,
        description: `Deliverable: ${deliverable.name} | Project: ${deliverable.project.name}`,
        startTime: deliverable.dueAt.toISOString(),
        allDay: true,
      });

      if (eventId) {
        await prisma.deliverable.update({
          where: { id: deliverable.id },
          data: { calendarEventId: eventId },
        });
        return jsonOk({ eventId });
      }
      return jsonError('Calendar sync failed');
    }

    if (action === 'update' && deliverable.calendarEventId) {
      const isDone = deliverable.status === 'DELIVERED';
      const success = await updateCalendarEvent(deliverable.ownerId, deliverable.calendarEventId, {
        title: deliverable.name,
        startTime: deliverable.dueAt?.toISOString(),
        allDay: true,
        done: isDone,
      });
      return success ? jsonOk({ updated: true }) : jsonError('Calendar update failed');
    }

    return jsonOk({ skipped: true, reason: 'No action needed' });
  }

  return jsonError('Unsupported entityType');
}
