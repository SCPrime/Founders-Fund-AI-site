import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { rateLimit } from '@/lib/rateLimit';
import { AllocationEngine } from '@/lib/allocationEngine';
import type { Contribution } from '@prisma/client';
import type { AllocationState, AllocationOutputs, Leg } from '@/types/allocation';
import { prisma } from '@/lib/prisma';
import { BASELINE_PORTFOLIO_ID } from '@/lib/constants';
import { ensureEntryFees } from '@/lib/fees';
import { z } from 'zod';

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

// Minimal validator; expand to your full AllocationState as needed
const LegSchema = z.object({
  owner: z.enum(['investor','founders']),
  name: z.string(),
  type: z.string(),
  amount: z.number(),
  ts: z.string(),
  earnsDollarDaysThisWindow: z.boolean().optional()
}).passthrough();

const StateSchema = z.object({
  legs: z.array(LegSchema).min(1)
}).passthrough();

function setRLHeaders(resp: NextResponse, ll: number, rr: number, resetAt: number) {
  resp.headers.set('X-RateLimit-Limit', String(ll));
  resp.headers.set('X-RateLimit-Remaining', String(rr));
  resp.headers.set('X-RateLimit-Reset', String(Math.floor(resetAt / 1000)));
  resp.headers.set('Cache-Control', 'no-store, max-age=0');
  resp.headers.set('Vary', 'x-forwarded-for');
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
    const clientIds = new Set(clientState.contributions.map((l) => l.id).filter(Boolean));
    const uniqBaseline = baselineLegs.filter((l) => !clientIds.has(l.id));

    const contributions = [...uniqBaseline, ...clientState.contributions].sort(
      (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
    );
    return { ...clientState, contributions };
  } catch (e) {
    console.error('Failed to merge baseline data:', e);
    return clientState;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 20 requests per minute per IP for calculations
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ??
              headersList.get('x-real-ip') ??
              'unknown';

    const rl = rateLimit(`calc:${ip}`, 20, 60_000);

    if (!rl.ok) {
      const res = NextResponse.json(
        { ok: false, error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now())/1000)))
          }
        }
      );
      setRLHeaders(res, rl.limit, rl.remaining, rl.resetAt);
      return res;
    }

    const json = await request.json().catch(() => null);
    if (!json) {
      const res = NextResponse.json({
        ok: false,
        error: 'Malformed JSON',
        example: {
          legs: [
            { owner:'investor', name:'Laura', type:'investor_contribution', amount:50000, ts:'2024-07-15T00:00:00Z' }
          ]
        }
      }, { status: 400 });
      setRLHeaders(res, rl.limit, rl.remaining, rl.resetAt);
      return res;
    }

    const parsed = StateSchema.safeParse(json);
    if (!parsed.success) {
      const res = NextResponse.json({
        ok: false,
        error: 'Validation failed',
        details: parsed.error.issues
      }, { status: 400 });
      setRLHeaders(res, rl.limit, rl.remaining, rl.resetAt);
      return res;
    }

    // Ensure fee legs present to quiet 10% warnings
    const rawData = parsed.data as { legs: Leg[]; window?: { start: string; end: string }; walletSizeEndOfWindow?: number; unrealizedPnlEndOfWindow?: number; constants?: object };
    const legsWithFees = ensureEntryFees(rawData.legs);

    // Build minimal AllocationState from legs (will be merged with baseline)
    const state: AllocationState = {
      ...rawData,
      contributions: legsWithFees,
      window: rawData.window || { start: '2024-01-01', end: '2024-12-31' },
      walletSizeEndOfWindow: rawData.walletSizeEndOfWindow || 0,
      unrealizedPnlEndOfWindow: rawData.unrealizedPnlEndOfWindow || 0,
      constants: (rawData.constants as AllocationState['constants']) || {
        INVESTOR_SEED_BASELINE: 20000,
        ENTRY_FEE_RATE: 0.10,
        MGMT_FEE_RATE: 0.20,
        FOUNDERS_MOONBAG_PCT: 0.75,
        FOUNDERS_COUNT: 2,
        ENTRY_FEE_REDUCES_INVESTOR_CREDIT: true
      }
    };

    // Auto-merge baseline data with client contributions
    const mergedState = await mergeWithBaseline(state);

    const outputs: AllocationOutputs = AllocationEngine.recompute(mergedState);

    const res = NextResponse.json(outputs, { status: 200 });
    setRLHeaders(res, rl.limit, rl.remaining, rl.resetAt);
    return res;
  } catch (e: unknown) {
    console.error('Calculate failed:', e);
    return NextResponse.json({ ok:false, error:'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST.' }, { status: 405 });
}
