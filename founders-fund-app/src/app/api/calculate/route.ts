import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { rateLimit } from '@/lib/rateLimit';
import { AllocationEngine } from '@/lib/allocationEngine';
import type { Contribution } from '@prisma/client';
import type { AllocationState, AllocationOutputs, Leg } from '@/types/allocation';
import { prisma } from '@/lib/prisma';
import { BASELINE_PORTFOLIO_ID } from '@/lib/constants';

// Convert Prisma Contribution to AllocationState Leg format
function contributionToLeg(r: Contribution): Leg {
  return {
    id: r.id,
    owner: r.owner,
    name: r.name,
    type: r.type,
    amount: Number(r.amount),
    ts: r.ts.toISOString(),
    earnsDollarDaysThisWindow: r.earnsDollarDaysThisWindow,
  };
}

// Auto-merge baseline data with client contributions
async function mergeWithBaseline(clientState: AllocationState): Promise<AllocationState> {
  try {
    const baselineRows = await prisma.contribution.findMany({
      where: { portfolioId: BASELINE_PORTFOLIO_ID },
      orderBy: { ts: 'asc' },
    });
    if (!baselineRows.length) return clientState;

    const baselineLegs = baselineRows.map(contributionToLeg);
    const clientIds = new Set(clientState.legs.map((l) => l.id));
    const uniqBaseline = baselineLegs.filter((l) => !clientIds.has(l.id));

    const legs = [...uniqBaseline, ...clientState.legs].sort(
      (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
    );
    return { ...clientState, legs };
  } catch (e) {
    console.error('Failed to merge baseline data:', e);
    return clientState;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 20 requests per minute per IP for calculations
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ??
              headersList.get('x-real-ip') ??
              'unknown';

    const rateLimitResult = rateLimit(`calc:${ip}`, 20, 60_000);

    // Prepare rate limit headers
    const rateLimitHeaders = {
      'X-RateLimit-Limit': rateLimitResult.limit.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': Math.floor(rateLimitResult.resetAt / 1000).toString(),
    };

    if (!rateLimitResult.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders,
            'Retry-After': Math.max(1, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)).toString(),
          }
        }
      );
    }
    const state = (await request.json()) as AllocationState;

    if (!state) {
      return NextResponse.json(
        { error: 'Missing allocation state in request body.' },
        { status: 400 },
      );
    }

    // Validate required fields
    if (!state.window || !state.constants) {
      return NextResponse.json(
        { error: 'Invalid allocation state: missing window or constants.' },
        { status: 400 },
      );
    }

    // Auto-merge baseline data with client contributions
    const mergedState = await mergeWithBaseline(state);

    const outputs: AllocationOutputs = AllocationEngine.recompute(mergedState);

    const response = NextResponse.json(outputs);

    // Set rate limiting headers
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Prevent caching of sensitive calculation data
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    response.headers.set('Vary', 'x-forwarded-for');
    return response;
  } catch (error: unknown) {
    console.error('Calculation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Calculation error' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST.' }, { status: 405 });
}
