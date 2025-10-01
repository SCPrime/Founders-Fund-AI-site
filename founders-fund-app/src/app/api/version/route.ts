import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? 'local',
    message: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? 'local dev',
    builtAt: process.env.VERCEL_BUILD_OUTPUT_ID ?? new Date().toISOString(),
    deploymentUrl: process.env.VERCEL_URL ?? 'localhost',
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'application/json'
    }
  });
}
