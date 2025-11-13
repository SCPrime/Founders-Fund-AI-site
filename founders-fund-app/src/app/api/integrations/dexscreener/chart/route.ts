import { NextRequest, NextResponse } from 'next/server';

const DEXSCREENER_BASE_URL = 'https://api.dexscreener.com/latest/dex';

/**
 * GET /api/integrations/dexscreener/chart
 * Get OHLCV chart data for a token from DexScreener
 *
 * Query params:
 * - chain: blockchain network (e.g., 'ethereum', 'solana', 'bsc')
 * - address: token contract address
 * - pairAddress: (optional) specific pair address
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain');
    const address = searchParams.get('address');
    const pairAddress = searchParams.get('pairAddress');

    if (!chain || !address) {
      return NextResponse.json(
        { error: 'Missing required parameters: chain and address' },
        { status: 400 }
      );
    }

    // Call DexScreener API to get pairs
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

    if (!data.pairs || data.pairs.length === 0) {
      return NextResponse.json(
        { error: 'No trading pairs found for this token' },
        { status: 404 }
      );
    }

    // Find the requested pair or use the first one
    let pair = data.pairs[0];
    if (pairAddress) {
      const foundPair = data.pairs.find((p: any) => p.pairAddress === pairAddress);
      if (foundPair) pair = foundPair;
    }

    // Format chart data
    const chartData = {
      pairAddress: pair.pairAddress,
      baseToken: {
        symbol: pair.baseToken?.symbol || '',
        name: pair.baseToken?.name || '',
        address: pair.baseToken?.address || '',
      },
      quoteToken: {
        symbol: pair.quoteToken?.symbol || '',
        name: pair.quoteToken?.name || '',
        address: pair.quoteToken?.address || '',
      },
      dexId: pair.dexId,
      url: pair.url || '',
      priceUsd: parseFloat(pair.priceUsd || '0'),
      priceNative: parseFloat(pair.priceNative || '0'),
      txns: {
        h24: {
          buys: pair.txns?.h24?.buys || 0,
          sells: pair.txns?.h24?.sells || 0,
        },
        h6: {
          buys: pair.txns?.h6?.buys || 0,
          sells: pair.txns?.h6?.sells || 0,
        },
        h1: {
          buys: pair.txns?.h1?.buys || 0,
          sells: pair.txns?.h1?.sells || 0,
        },
      },
      volume: {
        h24: parseFloat(pair.volume?.h24 || '0'),
        h6: parseFloat(pair.volume?.h6 || '0'),
        h1: parseFloat(pair.volume?.h1 || '0'),
      },
      priceChange: {
        h24: parseFloat(pair.priceChange?.h24 || '0'),
        h6: parseFloat(pair.priceChange?.h6 || '0'),
        h1: parseFloat(pair.priceChange?.h1 || '0'),
      },
      liquidity: {
        usd: parseFloat(pair.liquidity?.usd || '0'),
        base: parseFloat(pair.liquidity?.base || '0'),
        quote: parseFloat(pair.liquidity?.quote || '0'),
      },
      fdv: parseFloat(pair.fdv || '0'),
      marketCap: parseFloat(pair.marketCap || '0'),
      pairCreatedAt: pair.pairCreatedAt || null,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(chartData, { status: 200 });
  } catch (error) {
    console.error('DexScreener chart API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
