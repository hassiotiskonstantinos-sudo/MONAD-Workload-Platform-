import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireManager, jsonOk, jsonError } from '@/lib/api-utils';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const entityType = searchParams.get('entityType');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const where: Prisma.AuditLogWhereInput = {};

    if (userId) {
      where.subjectUserId = userId;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (from || to) {
      where.timestamp = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(limitParam || '50', 10) || 50), 100);
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
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return jsonError(message, 500);
  }
}
