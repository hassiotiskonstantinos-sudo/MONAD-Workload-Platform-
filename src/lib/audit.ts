import { prisma } from './prisma';

export async function logAudit(params: {
  actorId: string;
  subjectUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      subjectUserId: params.subjectUserId || null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || null,
      beforeJson: params.before ? JSON.parse(JSON.stringify(params.before)) : undefined,
      afterJson: params.after ? JSON.parse(JSON.stringify(params.after)) : undefined,
    },
  });
}
