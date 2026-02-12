import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireManager, requireAuth, jsonOk, jsonError } from '@/lib/api-utils';
import { UserRole } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getSession();
  const authErr = requireAuth(session);
  if (authErr) return authErr;

  const isManager = session!.user.role === UserRole.MANAGER;

  if (!isManager) {
    // Members can only get their own info
    const user = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        canCreateWorkload: true,
        logFutureWindowDays: true,
      },
    });
    return jsonOk([user]);
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      workloadCalendarId: true,
      canCreateWorkload: true,
      logFutureWindowDays: true,
      showEventTitles: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });

  return jsonOk(users);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const body = await req.json();
  const { userId, role, canCreateWorkload, logFutureWindowDays, showEventTitles } = body;

  if (!userId) return jsonError('userId is required');

  const data: Record<string, unknown> = {};
  if (role !== undefined) data.role = role;
  if (canCreateWorkload !== undefined) data.canCreateWorkload = canCreateWorkload;
  if (logFutureWindowDays !== undefined) data.logFutureWindowDays = logFutureWindowDays;
  if (showEventTitles !== undefined) data.showEventTitles = showEventTitles;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      canCreateWorkload: true,
      logFutureWindowDays: true,
      showEventTitles: true,
    },
  });

  return jsonOk(user);
}
