import { NextRequest, NextResponse } from 'next/server';
import { getPriceFeed, type TokenConfig } from '@/lib/priceFeed';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/jobs/update-prices
 * Background job to update all agent token prices
 *
 * This endpoint should be called:
 * - By a cron job every 30 seconds
 * - Or manually triggered for immediate update
 *
 * Query params:
 * - key: (optional) API key for authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Check for API key to prevent unauthorized access
    const apiKey = request.nextUrl.searchParams.get('key');
    const expectedKey = process.env.CRON_SECRET || process.env.API_SECRET;

    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const startTime = Date.now();
    console.log('[Price Update Job] Starting price updates...');

    // Define your agent tokens here
    // In production, you might fetch this from database or config
    const agentTokens: TokenConfig[] = [
      // Example tokens - customize based on your agents
      {
        symbol: 'VIRTUAL',
        chain: 'ethereum',
        address: '0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b',
        coinbasePair: 'VIRTUAL-USD',
      },
      {
        symbol: 'AIXBT',
        chain: 'ethereum',
        address: '0x4f9fd6be4a90f2620860d680c0d4d5fb53d1a825',
      },
      {
        symbol: 'ZEREBRO',
        chain: 'ethereum',
        address: '0x89ced83ebfb4cb0a63d82679e475dd4c7a99d95b',
      },
      {
        symbol: 'VADER',
        chain: 'ethereum',
        address: '0x58fd1b2330d9f7b69f1dd25aa61b41a04f4e1f67',
      },
      // Add more tokens as needed
    ];

    // Fetch prices in parallel
    const priceFeed = getPriceFeed();
    const priceResults = await priceFeed.getPrices(agentTokens);

    // Prepare update data
    const updates: Array<{ symbol: string; price: number; source: string }> = [];
    const errors: Array<{ symbol: string; error: string }> = [];

    for (const token of agentTokens) {
      const priceData = priceResults.get(token.symbol);
      if (priceData) {
        updates.push({
          symbol: token.symbol,
          price: priceData.price,
          source: priceData.source,
        });
      } else {
        errors.push({
          symbol: token.symbol,
          error: 'Price not available',
        });
      }
    }

    // Update database (if you have a price history table)
    // Example: Store in a PriceHistory table
    try {
      // This is a placeholder - adjust based on your schema
      // await prisma.priceHistory.createMany({
      //   data: updates.map(u => ({
      //     symbol: u.symbol,
      //     price: u.price,
      //     source: u.source,
      //     timestamp: new Date(),
      //   })),
      // });

      console.log(`[Price Update Job] Successfully updated ${updates.length} prices`);
    } catch (dbError) {
      console.error('[Price Update Job] Database error:', dbError);
      // Continue even if DB update fails
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      stats: {
        totalTokens: agentTokens.length,
        successfulUpdates: updates.length,
        failedUpdates: errors.length,
      },
      updates,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 200 });
  } catch (error) {
    console.error('[Price Update Job] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/update-prices
 * Get status of the price update job
 */
export async function GET(request: NextRequest) {
  try {
    const priceFeed = getPriceFeed();
    const cacheStats = priceFeed.getCacheStats();

    return NextResponse.json({
      status: 'ready',
      cache: {
        size: cacheStats.size,
        entries: cacheStats.entries,
      },
      info: 'Use POST to trigger price updates',
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
