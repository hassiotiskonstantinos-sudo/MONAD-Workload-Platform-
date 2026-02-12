import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireManager, jsonOk, jsonError } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const financials = await prisma.financial.findMany({
    include: {
      project: {
        select: { id: true, name: true, client: true, status: true },
      },
    },
  });

  return jsonOk(financials);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const body = await req.json();
  const { projectId, budget, invoiced, collected, costs, notes } = body;

  if (!projectId) return jsonError('projectId is required');

  const existing = await prisma.financial.findUnique({ where: { projectId } });

  const financial = await prisma.financial.upsert({
    where: { projectId },
    update: {
      budget: budget ?? undefined,
      invoiced: invoiced ?? undefined,
      collected: collected ?? undefined,
      costs: costs ?? undefined,
      notes: notes ?? undefined,
    },
    create: {
      projectId,
      budget: budget || null,
      invoiced: invoiced || null,
      collected: collected || null,
      costs: costs || null,
      notes: notes || null,
    },
  });

  await logAudit({
    actorId: session!.user.id,
    action: 'FINANCIAL_UPDATED',
    entityType: 'financial',
    entityId: projectId,
    before: existing,
    after: financial,
  });

  return jsonOk(financial);
}
