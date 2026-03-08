import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    GOOGLE_CLIENT_ID_length: (process.env.GOOGLE_CLIENT_ID ?? '').length,
    GOOGLE_CLIENT_ID_prefix: (process.env.GOOGLE_CLIENT_ID ?? '').substring(0, 10),
    GOOGLE_CLIENT_SECRET_length: (process.env.GOOGLE_CLIENT_SECRET ?? '').length,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'NOT SET',
    NEXTAUTH_SECRET_length: (process.env.NEXTAUTH_SECRET ?? '').length,
    VERCEL_URL: process.env.VERCEL_URL ?? 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    expected_callback: `${process.env.NEXTAUTH_URL ?? `https://${process.env.VERCEL_URL ?? 'unknown'}`}/api/auth/callback/google`,
  });
}
