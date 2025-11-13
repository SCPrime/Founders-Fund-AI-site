import { NextRequest, NextResponse } from 'next/server';

const DEXSCREENER_BASE_URL = 'https://api.dexscreener.com/latest/dex';

/**
 * GET /api/integrations/dexscreener/pairs
 * Get all trading pairs and liquidity info for a token from DexScreener
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

    if (!data.pairs || data.pairs.length === 0) {
      return NextResponse.json(
        { error: 'No trading pairs found for this token' },
        { status: 404 }
      );
    }

    // Format all pairs data
    const pairs = data.pairs.map((pair: any) => ({
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
      chainId: pair.chainId || chain,
      labels: pair.labels || [],
      priceUsd: parseFloat(pair.priceUsd || '0'),
      priceNative: parseFloat(pair.priceNative || '0'),
      volume24h: parseFloat(pair.volume?.h24 || '0'),
      liquidity: {
        usd: parseFloat(pair.liquidity?.usd || '0'),
        base: parseFloat(pair.liquidity?.base || '0'),
        quote: parseFloat(pair.liquidity?.quote || '0'),
      },
      fdv: parseFloat(pair.fdv || '0'),
      marketCap: parseFloat(pair.marketCap || '0'),
      priceChange24h: parseFloat(pair.priceChange?.h24 || '0'),
      buys24h: pair.txns?.h24?.buys || 0,
      sells24h: pair.txns?.h24?.sells || 0,
      pairCreatedAt: pair.pairCreatedAt || null,
      url: pair.url || '',
    }));

    // Sort by liquidity (highest first)
    pairs.sort((a: any, b: any) => b.liquidity.usd - a.liquidity.usd);

    return NextResponse.json({
      schemaVersion: data.schemaVersion || '1.0.0',
      pairs,
      totalPairs: pairs.length,
      lastUpdated: new Date().toISOString(),
    }, { status: 200 });
  } catch (error) {
    console.error('DexScreener pairs API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
