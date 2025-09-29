import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { rateLimit } from '@/lib/rateLimit';
import { AllocationEngine } from '@/lib/allocationEngine';
import type { AllocationState, AllocationOutputs } from '@/types/allocation';

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

    const outputs: AllocationOutputs = AllocationEngine.recompute(state);

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
