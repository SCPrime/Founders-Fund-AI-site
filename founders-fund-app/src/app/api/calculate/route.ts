import { NextRequest, NextResponse } from 'next/server';
import { AllocationEngine } from '@/lib/allocationEngine';
import type { AllocationState, AllocationOutputs } from '@/types/allocation';

export async function POST(request: NextRequest) {
  try {
    const state = await request.json() as AllocationState;

    if (!state) {
      return NextResponse.json(
        { error: 'Missing allocation state in request body.' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!state.window || !state.constants) {
      return NextResponse.json(
        { error: 'Invalid allocation state: missing window or constants.' },
        { status: 400 }
      );
    }

    const outputs: AllocationOutputs = AllocationEngine.recompute(state);

    return NextResponse.json(outputs);
  } catch (error: unknown) {
    console.error('Calculation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Calculation error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}