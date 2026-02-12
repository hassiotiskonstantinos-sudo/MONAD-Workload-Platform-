import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireManager, jsonOk, jsonError } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const projectId = req.nextUrl.searchParams.get('projectId');
  const where = projectId ? { projectId } : {};

  const milestones = await prisma.milestone.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      deliverables: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { dueAt: 'asc' },
  });

  return jsonOk(milestones);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const body = await req.json();
  const { name, projectId, dueAt, description } = body;

  if (!name || !projectId) return jsonError('Name and projectId are required');

  const milestone = await prisma.milestone.create({
    data: {
      name,
      projectId,
      dueAt: dueAt ? new Date(dueAt) : null,
      description: description || null,
    },
  });

  await logAudit({
    actorId: session!.user.id,
    action: 'MILESTONE_CREATED',
    entityType: 'milestone',
    entityId: milestone.id,
    after: milestone,
  });

  return jsonOk(milestone);
}
