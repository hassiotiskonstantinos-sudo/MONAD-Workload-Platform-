import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'DATABASE_URL',
  ];

  const report: Record<string, { exists: boolean; length: number; preview: string }> = {};

  for (const name of envVars) {
    const val = process.env[name];
    report[name] = {
      exists: val !== undefined && val !== '',
      length: val?.length ?? 0,
      preview: val
        ? `${val.substring(0, 4)}...${ val.length > 4 ? val.substring(val.length - 4) : ''}`
        : '(empty)',
    };
  }

  // Also list ALL env var keys that contain "GOOGLE" or "SECRET" or "CLIENT"
  const relatedKeys = Object.keys(process.env).filter(
    (k) => k.includes('GOOGLE') || k.includes('SECRET') || k.includes('CLIENT')
  );

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: report,
    relatedEnvKeys: relatedKeys,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
}
