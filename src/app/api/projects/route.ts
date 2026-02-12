import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireManager, jsonOk, jsonError, getSearchParams } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const params = getSearchParams(req);

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;

  const projects = await prisma.project.findMany({
    where,
    include: {
      _count: { select: { tasks: true, deliverables: true, milestones: true } },
      financial: { select: { budget: true, invoiced: true, collected: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return jsonOk(projects);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const body = await req.json();
  const { name, client, status, startDate, endDate, driveFolderId } = body;

  if (!name) return jsonError('Name is required');

  const project = await prisma.project.create({
    data: {
      name,
      client: client || null,
      status: status || 'ACTIVE',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      driveFolderId: driveFolderId || null,
      createdById: session!.user.id,
    },
  });

  // Create financial record
  await prisma.financial.create({
    data: { projectId: project.id },
  });

  await logAudit({
    actorId: session!.user.id,
    action: 'PROJECT_CREATED',
    entityType: 'project',
    entityId: project.id,
    after: project,
  });

  return jsonOk(project);
}
