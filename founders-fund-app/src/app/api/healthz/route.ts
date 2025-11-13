import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BASELINE_PORTFOLIO_ID } from '@/lib/constants';

// Ensure Node.js runtime for database operations
export const runtime = 'nodejs';

export async function GET() {
  try {
    const [ row ] = await prisma.$queryRawUnsafe<{ now: Date }[]>(`select now() as now`);
    const baselineCount = await prisma.contribution.count({ where: { portfolioId: BASELINE_PORTFOLIO_ID }});
    const response = NextResponse.json({
      ok: true,
      db: true,
      ts: row?.now ?? new Date(),
      baseline: { portfolioId: BASELINE_PORTFOLIO_ID, contributions: baselineCount }
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'db error';
    return NextResponse.json({ ok: true, db: false, error: errorMessage }, { status: 200 });
  }
}
