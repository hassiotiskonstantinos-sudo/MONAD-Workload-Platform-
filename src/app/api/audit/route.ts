import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireManager, jsonOk, jsonError, getSearchParams } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const params = getSearchParams(req);

  const where: Record<string, unknown> = {};

  // Filter by subject user (for person log view)
  if (params.userId) {
    where.subjectUserId = params.userId;
  }

  // Filter by entity type
  if (params.entityType) {
    where.entityType = params.entityType;
  }

  // Date range filter
  if (params.from || params.to) {
    where.timestamp = {};
    if (params.from) (where.timestamp as Record<string, Date>).gte = new Date(params.from);
    if (params.to) (where.timestamp as Record<string, Date>).lte = new Date(params.to);
  }

  const page = parseInt(params.page || '1');
  const limit = Math.min(parseInt(params.limit || '50'), 100);
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true, email: true } },
        subject: { select: { id: true, name: true, email: true } },
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return jsonOk({ logs, total, page, limit });
}
