import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireManager, jsonOk, jsonError, getSearchParams } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';
import { createCalendarEvent } from '@/lib/google-calendar';

export async function GET(req: NextRequest) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const params = getSearchParams(req);

  const where: Record<string, unknown> = {};

  if (params.projectId) where.projectId = params.projectId;
  if (params.status) where.status = params.status;
  if (params.ownerId) where.ownerId = params.ownerId;

  // Pending deliverables filter
  if (params.pending === 'true') {
    where.status = { not: 'DELIVERED' };
  }

  // Due date filters
  if (params.dueWithin) {
    const days = parseInt(params.dueWithin);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    where.dueAt = { lte: cutoff };
  }

  if (params.overdue === 'true') {
    where.dueAt = { lt: new Date() };
    where.status = { not: 'DELIVERED' };
  }

  const deliverables = await prisma.deliverable.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      milestone: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, email: true } },
    },
    orderBy: { dueAt: 'asc' },
  });

  return jsonOk(deliverables);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const body = await req.json();
  const { name, projectId, milestoneId, ownerId, dueAt, status, driveLink } = body;

  if (!name || !projectId) return jsonError('Name and projectId are required');

  const deliverable = await prisma.deliverable.create({
    data: {
      name,
      projectId,
      milestoneId: milestoneId || null,
      ownerId: ownerId || null,
      dueAt: dueAt ? new Date(dueAt) : null,
      status: status || 'DRAFT',
      driveLink: driveLink || null,
    },
    include: {
      project: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  // Create calendar event for owner
  if (deliverable.ownerId && deliverable.dueAt) {
    const eventId = await createCalendarEvent(deliverable.ownerId, {
      title: `Deliverable: ${deliverable.name}`,
      description: `Deliverable for project: ${deliverable.project.name}`,
      startTime: deliverable.dueAt.toISOString(),
      allDay: true,
    });

    if (eventId) {
      await prisma.deliverable.update({
        where: { id: deliverable.id },
        data: { calendarEventId: eventId },
      });
    }
  }

  await logAudit({
    actorId: session!.user.id,
    subjectUserId: ownerId || undefined,
    action: 'DELIVERABLE_CREATED',
    entityType: 'deliverable',
    entityId: deliverable.id,
    after: deliverable,
  });

  return jsonOk(deliverable);
}
