import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export interface AuthSession {
  user: {
    id: string;
    role: string;
    email: string;
    name?: string | null;
  };
}

export async function getSession(): Promise<AuthSession | null> {
  const session = await getServerSession(authOptions());
  if (!session?.user?.id) return null;
  return session as AuthSession;
}

export function requireManager(session: AuthSession | null): NextResponse | null {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export function requireAuth(session: AuthSession | null): NextResponse | null {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export function jsonOk(data: unknown) {
  return NextResponse.json(data);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function getSearchParams(req: NextRequest) {
  return Object.fromEntries(req.nextUrl.searchParams.entries());
}
