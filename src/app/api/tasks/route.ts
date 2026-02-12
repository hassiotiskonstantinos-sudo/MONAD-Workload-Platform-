import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireAuth, requireManager, jsonOk, jsonError, getSearchParams } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';
import { createCalendarEvent, updateCalendarEvent } from '@/lib/google-calendar';
import { UserRole } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getSession();
  const authErr = requireAuth(session);
  if (authErr) return authErr;

  const params = getSearchParams(req);
  const isManager = session!.user.role === UserRole.MANAGER;

  const where: Record<string, unknown> = {};

  // Members can only see their own tasks
  if (!isManager) {
    where.assigneeId = session!.user.id;
  }

  if (params.assigneeId && isManager) {
    where.assigneeId = params.assigneeId;
  }

  if (params.projectId) {
    where.projectId = params.projectId;
  }

  if (params.status) {
    where.status = params.status;
  }

  if (params.dueBefore) {
    where.dueAt = { ...(where.dueAt as object || {}), lte: new Date(params.dueBefore) };
  }

  if (params.dueAfter) {
    where.dueAt = { ...(where.dueAt as object || {}), gte: new Date(params.dueAfter) };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { dueAt: 'asc' },
  });

  return jsonOk(tasks);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  // Only managers can create tasks (or members for themselves if allowed)
  const isManager = session?.user.role === UserRole.MANAGER;

  if (!session) return jsonError('Unauthorized', 401);

  const body = await req.json();
  const { title, description, status, dueAt, assigneeId, projectId, driveLink, tags } = body;

  if (!title) return jsonError('Title is required');

  // Members can only create tasks for themselves
  const effectiveAssignee = isManager ? (assigneeId || null) : session.user.id;

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      status: status || 'NOT_STARTED',
      dueAt: dueAt ? new Date(dueAt) : null,
      assigneeId: effectiveAssignee,
      projectId: projectId || null,
      driveLink: driveLink || null,
      tags: tags || [],
      createdById: session.user.id,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
  });

  // Create calendar event for assignee
  if (task.assigneeId && task.dueAt) {
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
    }
  }

  await logAudit({
    actorId: session.user.id,
    subjectUserId: effectiveAssignee || undefined,
    action: 'TASK_CREATED',
    entityType: 'task',
    entityId: task.id,
    after: task,
  });

  return jsonOk(task);
}
