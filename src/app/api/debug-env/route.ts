import { NextResponse } from 'next/server';

export async function GET() {
  // Compare dot notation (webpack-inlined) vs bracket notation (runtime)
  const dotNotation = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
  };

  const bracketNotation: Record<string, string | undefined> = {};
  for (const key of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'NEXTAUTH_SECRET', 'DATABASE_URL']) {
    bracketNotation[key] = process.env[key];
  }

  function summarize(val: string | undefined) {
    if (val === undefined) return { exists: false, length: 0, preview: '(undefined)' };
    if (val === '') return { exists: false, length: 0, preview: '(empty string)' };
    return {
      exists: true,
      length: val.length,
      preview: `${val.substring(0, 4)}...${val.length > 4 ? val.substring(val.length - 4) : ''}`,
    };
  }

  const report: Record<string, unknown> = {};
  for (const key of Object.keys(dotNotation)) {
    report[key] = {
      dotNotation: summarize(dotNotation[key as keyof typeof dotNotation]),
      bracketNotation: summarize(bracketNotation[key]),
      match: dotNotation[key as keyof typeof dotNotation] === bracketNotation[key],
    };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: report,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env['VERCEL_ENV'],
  });
}
