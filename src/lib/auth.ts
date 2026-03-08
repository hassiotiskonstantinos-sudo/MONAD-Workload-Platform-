import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// Lazy-load prisma to avoid crashing if DATABASE_URL is missing
async function getPrisma() {
  const { prisma } = await import('./prisma');
  return prisma;
}

// Create PrismaAdapter with error handling
function createAdapter() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaAdapter } = require('@next-auth/prisma-adapter');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { prisma } = require('./prisma');
    return PrismaAdapter(prisma);
  } catch (e) {
    console.error('[AUTH] PrismaAdapter creation FAILED:', e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Returns NextAuth options at request time so that env vars are
 * always read from the live process.env, never from a build-time snapshot.
 */
export function authOptions(): NextAuthOptions {
  const googleClientId = process.env['GOOGLE_CLIENT_ID'] ?? '';
  const googleClientSecret = process.env['GOOGLE_CLIENT_SECRET'] ?? '';
  const nextAuthSecret = process.env['NEXTAUTH_SECRET'] ?? '';
  const allowedDomain = process.env['ALLOWED_DOMAIN'] ?? '';
  const adminEmails = (process.env['ADMIN_EMAILS'] ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  console.log('[AUTH] clientId length:', googleClientId.length, 'clientSecret length:', googleClientSecret.length);

  const adapter = createAdapter();

  return {
    debug: true,
    logger: {
      error(code, metadata) {
        console.error('[NEXTAUTH ERROR]', code, JSON.stringify(metadata, null, 2));
      },
      warn(code) {
        console.warn('[NEXTAUTH WARN]', code);
      },
      debug(code, metadata) {
        console.log('[NEXTAUTH DEBUG]', code, JSON.stringify(metadata, null, 2));
      },
    },
    ...(adapter ? { adapter } : {}),
    providers: [
      GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        authorization: {
          params: {
            scope: [
              'openid',
              'email',
              'profile',
              'https://www.googleapis.com/auth/calendar',
              'https://www.googleapis.com/auth/calendar.events',
              'https://www.googleapis.com/auth/drive.file',
              'https://www.googleapis.com/auth/drive.readonly',
            ].join(' '),
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      }),
    ],
    callbacks: {
      async signIn({ user }) {
        console.log('[AUTH] signIn callback, user email:', user.email);
        if (!user.email) return false;
        if (allowedDomain && !user.email.endsWith(`@${allowedDomain}`)) {
          return '/auth/error?error=AccessDenied';
        }
        return true;
      },
      async session({ session, user }) {
        try {
          const prisma = await getPrisma();
          if (session.user) {
            const dbUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { id: true, role: true, email: true, name: true, image: true },
            });
            if (dbUser) {
              session.user.id = dbUser.id;
              session.user.role = dbUser.role;
            }
          }
        } catch (e) {
          console.error('[AUTH] session callback DB error:', e);
        }
        return session;
      },
    },
    events: {
      async createUser({ user }) {
        try {
          const prisma = await getPrisma();
          if (user.email && adminEmails.includes(user.email.toLowerCase())) {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: 'MANAGER' },
            });
          }
        } catch (e) {
          console.error('[AUTH] createUser event DB error:', e);
        }
      },
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    },
    session: {
      strategy: adapter ? 'database' : 'jwt',
    },
    secret: nextAuthSecret,
  };
}

export function isManager(role: string | undefined): boolean {
  return role === 'MANAGER';
}
