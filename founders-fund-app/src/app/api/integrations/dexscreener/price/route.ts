import { NextRequest, NextResponse } from 'next/server';

const DEXSCREENER_BASE_URL = 'https://api.dexscreener.com/latest/dex';

/**
 * GET /api/integrations/dexscreener/price
 * Get current price for a token from DexScreener
 *
 * Query params:
 * - chain: blockchain network (e.g., 'ethereum', 'solana', 'bsc')
 * - address: token contract address
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain');
    const address = searchParams.get('address');

    if (!chain || !address) {
      return NextResponse.json(
        { error: 'Missing required parameters: chain and address' },
        { status: 400 }
      );
    }

    // Call DexScreener API
    const url = `${DEXSCREENER_BASE_URL}/tokens/${chain}/${address}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 30 }, // Cache for 30 seconds
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `DexScreener API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract price information from the first pair
    if (!data.pairs || data.pairs.length === 0) {
      return NextResponse.json(
        { error: 'No trading pairs found for this token' },
        { status: 404 }
      );
    }

    const pair = data.pairs[0];
    const priceInfo = {
      price: parseFloat(pair.priceUsd || '0'),
      priceNative: parseFloat(pair.priceNative || '0'),
      volume24h: parseFloat(pair.volume?.h24 || '0'),
      liquidity: parseFloat(pair.liquidity?.usd || '0'),
      priceChange24h: parseFloat(pair.priceChange?.h24 || '0'),
      pairAddress: pair.pairAddress,
      dexId: pair.dexId,
      symbol: pair.baseToken?.symbol || '',
      name: pair.baseToken?.name || '',
      chain: chain,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(priceInfo, { status: 200 });
  } catch (error) {
    console.error('DexScreener price API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
