import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  try {
    const client = new PrismaClient({
      log: ['error', 'warn'],
    });
    console.log('[PRISMA] Client created successfully');
    return client;
  } catch (e) {
    console.error('[PRISMA] FATAL: Failed to create PrismaClient:', e);
    throw e;
  }
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
