import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireAuth, jsonOk, jsonError } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';
import { updateCalendarEvent } from '@/lib/google-calendar';
import { UserRole } from '@prisma/client';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  const authErr = requireAuth(session);
  if (authErr) return authErr;

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      project: { select: { id: true, name: true } },
    },
  });

  if (!task) return jsonError('Not found', 404);

  // Members can only see their own tasks
  if (session!.user.role !== UserRole.MANAGER && task.assigneeId !== session!.user.id) {
    return jsonError('Forbidden', 403);
  }

  return jsonOk(task);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  const authErr = requireAuth(session);
  if (authErr) return authErr;

  const existing = await prisma.task.findUnique({ where: { id: params.id } });
  if (!existing) return jsonError('Not found', 404);

  const isManager = session!.user.role === UserRole.MANAGER;
  const isAssignee = existing.assigneeId === session!.user.id;

  if (!isManager && !isAssignee) {
    return jsonError('Forbidden', 403);
  }

  const body = await req.json();

  // Members can only update status and dueAt
  const data: Record<string, unknown> = {};
  if (isManager) {
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId;
    if (body.projectId !== undefined) data.projectId = body.projectId;
    if (body.driveLink !== undefined) data.driveLink = body.driveLink;
    if (body.tags !== undefined) data.tags = body.tags;
  }
  if (body.status !== undefined) data.status = body.status;
  if (body.dueAt !== undefined) data.dueAt = body.dueAt ? new Date(body.dueAt) : null;

  const task = await prisma.task.update({
    where: { id: params.id },
    data,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
  });

  // Sync calendar event
  if (task.calendarEventId && task.assigneeId) {
    const isDone = task.status === 'DONE';
    await updateCalendarEvent(task.assigneeId, task.calendarEventId, {
      title: task.title,
      startTime: task.dueAt?.toISOString(),
      allDay: true,
      done: isDone,
    });
  }

  await logAudit({
    actorId: session!.user.id,
    subjectUserId: task.assigneeId || undefined,
    action: 'TASK_UPDATED',
    entityType: 'task',
    entityId: task.id,
    before: existing,
    after: task,
  });

  return jsonOk(task);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  const err = requireAuth(session);
  if (err) return err;

  if (session!.user.role !== UserRole.MANAGER) {
    return jsonError('Forbidden', 403);
  }

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return jsonError('Not found', 404);

  await prisma.task.delete({ where: { id: params.id } });

  await logAudit({
    actorId: session!.user.id,
    subjectUserId: task.assigneeId || undefined,
    action: 'TASK_DELETED',
    entityType: 'task',
    entityId: task.id,
    before: task,
  });

  return jsonOk({ success: true });
}
