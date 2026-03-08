import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './prisma';

const adminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const allowedDomain = process.env.ALLOWED_DOMAIN || '';

const googleClientId = process.env.GOOGLE_CLIENT_ID ?? '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';

console.log('[AUTH CONFIG] GOOGLE_CLIENT_ID exists:', !!googleClientId);
console.log('[AUTH CONFIG] GOOGLE_CLIENT_ID length:', googleClientId.length);
console.log('[AUTH CONFIG] GOOGLE_CLIENT_ID preview:', googleClientId.slice(0, 8) + '...');
console.log('[AUTH CONFIG] GOOGLE_CLIENT_SECRET exists:', !!googleClientSecret);
console.log('[AUTH CONFIG] GOOGLE_CLIENT_SECRET length:', googleClientSecret.length);
console.log('[AUTH CONFIG] NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('[AUTH CONFIG] NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET);
console.log('[AUTH CONFIG] DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('[AUTH CONFIG] ALLOWED_DOMAIN:', allowedDomain || '(empty)');
// Log all env var keys that contain GOOGLE or AUTH to catch naming mismatches
console.log('[AUTH CONFIG] Env keys with GOOGLE:', Object.keys(process.env).filter(k => k.includes('GOOGLE')));
console.log('[AUTH CONFIG] Env keys with AUTH:', Object.keys(process.env).filter(k => k.includes('AUTH')));

if (!googleClientId || !googleClientSecret) {
  console.error('[AUTH CONFIG] FATAL: Missing Google OAuth credentials!');
  console.error('[AUTH CONFIG] GOOGLE_CLIENT_ID is', googleClientId ? 'SET' : 'EMPTY/MISSING');
  console.error('[AUTH CONFIG] GOOGLE_CLIENT_SECRET is', googleClientSecret ? 'SET' : 'EMPTY/MISSING');
}

export const authOptions: NextAuthOptions = {
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
  adapter: PrismaAdapter(prisma),
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
      if (!user.email) return false;
      if (allowedDomain && !user.email.endsWith(`@${allowedDomain}`)) {
        return '/auth/error?error=AccessDenied';
      }
      return true;
    },
    async session({ session, user }) {
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
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.email && adminEmails.includes(user.email.toLowerCase())) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'MANAGER' },
        });
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'database',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function isManager(role: string | undefined): boolean {
  return role === 'MANAGER';
}
