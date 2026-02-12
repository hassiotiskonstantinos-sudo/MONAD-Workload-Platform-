import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireAuth, jsonOk, jsonError, getSearchParams } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';
import { createCalendarEvent } from '@/lib/google-calendar';
import { UserRole } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getSession();
  const authErr = requireAuth(session);
  if (authErr) return authErr;

  const params = getSearchParams(req);
  const isManager = session!.user.role === UserRole.MANAGER;

  const where: Record<string, unknown> = {};

  if (!isManager) {
    where.userId = session!.user.id;
    // Members only see present/future
    where.startAt = { gte: new Date(new Date().setHours(0, 0, 0, 0)) };
  } else if (params.userId) {
    where.userId = params.userId;
  }

  if (params.status) where.status = params.status;

  const items = await prisma.workloadItem.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { startAt: 'asc' },
  });

  return jsonOk(items);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const authErr = requireAuth(session);
  if (authErr) return authErr;

  const body = await req.json();
  const { title, userId, startAt, endAt, status, projectId } = body;

  if (!title || !startAt) return jsonError('Title and startAt are required');

  const isManager = session!.user.role === UserRole.MANAGER;
  const effectiveUserId = isManager ? (userId || session!.user.id) : session!.user.id;

  // Check if member is allowed to create workload items
  if (!isManager) {
    const userSettings = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: { canCreateWorkload: true },
    });
    if (!userSettings?.canCreateWorkload) {
      return jsonError('Not allowed to create workload items', 403);
    }
  }

  const item = await prisma.workloadItem.create({
    data: {
      title,
      userId: effectiveUserId,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
      status: status || 'PLANNED',
      projectId: projectId || null,
      createdById: session!.user.id,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
  });

  // Create calendar event
  const eventId = await createCalendarEvent(effectiveUserId, {
    title: item.title,
    description: item.project ? `Project: ${item.project.name}` : undefined,
    startTime: item.startAt.toISOString(),
    endTime: item.endAt?.toISOString(),
    allDay: !item.endAt,
  });

  if (eventId) {
    await prisma.workloadItem.update({
      where: { id: item.id },
      data: { calendarEventId: eventId },
    });
  }

  await logAudit({
    actorId: session!.user.id,
    subjectUserId: effectiveUserId,
    action: 'WORKLOAD_CREATED',
    entityType: 'workload_item',
    entityId: item.id,
    after: item,
  });

  return jsonOk(item);
}
