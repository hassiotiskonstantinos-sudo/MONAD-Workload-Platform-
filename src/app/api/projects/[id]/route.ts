import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireManager, jsonOk, jsonError } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { dueAt: 'asc' },
      },
      milestones: {
        include: {
          deliverables: {
            include: {
              owner: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { dueAt: 'asc' },
      },
      deliverables: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
          milestone: { select: { id: true, name: true } },
        },
        orderBy: { dueAt: 'asc' },
      },
      financial: true,
      financialDocs: { orderBy: { createdAt: 'desc' } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!project) return jsonError('Not found', 404);

  return jsonOk(project);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const existing = await prisma.project.findUnique({ where: { id: params.id } });
  if (!existing) return jsonError('Not found', 404);

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.client !== undefined) data.client = body.client;
  if (body.status !== undefined) data.status = body.status;
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.driveFolderId !== undefined) data.driveFolderId = body.driveFolderId;

  const project = await prisma.project.update({
    where: { id: params.id },
    data,
  });

  await logAudit({
    actorId: session!.user.id,
    action: 'PROJECT_UPDATED',
    entityType: 'project',
    entityId: project.id,
    before: existing,
    after: project,
  });

  return jsonOk(project);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  await prisma.project.delete({ where: { id: params.id } });

  await logAudit({
    actorId: session!.user.id,
    action: 'PROJECT_DELETED',
    entityType: 'project',
    entityId: params.id,
  });

  return jsonOk({ success: true });
}
