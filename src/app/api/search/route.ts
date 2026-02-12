import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireManager, jsonOk, jsonError } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const q = req.nextUrl.searchParams.get('q');
  if (!q || q.length < 2) return jsonError('Query must be at least 2 characters');

  const searchTerm = `%${q}%`;

  const [tasks, projects, deliverables] = await Promise.all([
    prisma.task.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true, status: true, dueAt: true },
      take: 10,
    }),
    prisma.project.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { client: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, status: true, client: true },
      take: 10,
    }),
    prisma.deliverable.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
      },
      select: { id: true, name: true, status: true, dueAt: true },
      take: 10,
    }),
  ]);

  return jsonOk({
    tasks: tasks.map((t) => ({ ...t, type: 'task' })),
    projects: projects.map((p) => ({ ...p, type: 'project' })),
    deliverables: deliverables.map((d) => ({ ...d, type: 'deliverable' })),
  });
}
