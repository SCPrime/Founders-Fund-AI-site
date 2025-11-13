import { NextRequest, NextResponse } from 'next/server';

const DEXTOOLS_BASE_URL = 'https://api.dextools.io/v2';

/**
 * GET /api/integrations/dextools/transactions
 * Get recent trades for a token from DEXTools
 *
 * Query params:
 * - chain: blockchain network (e.g., 'ether', 'bsc', 'polygon')
 * - address: token contract address (pair address)
 * - page: (optional) page number for pagination (default: 1)
 * - pageSize: (optional) items per page (default: 50, max: 100)
 *
 * Note: Requires DEXTOOLS_API_KEY environment variable
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.DEXTOOLS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'DEXTools API key not configured' },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain');
    const address = searchParams.get('address');
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '50';

    if (!chain || !address) {
      return NextResponse.json(
        { error: 'Missing required parameters: chain and address' },
        { status: 400 }
      );
    }

    // Call DEXTools API for pool transactions
    const url = `${DEXTOOLS_BASE_URL}/pool/${chain}/${address}/txs?page=${page}&pageSize=${pageSize}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': apiKey,
      },
      next: { revalidate: 15 }, // Cache for 15 seconds (transaction data is fresh)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DEXTools API error:', response.status, errorText);
      return NextResponse.json(
        { error: `DEXTools API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.statusCode !== 200 || !data.data) {
      return NextResponse.json(
        { error: 'Invalid response from DEXTools API' },
        { status: 500 }
      );
    }

    // Process transactions
    const transactions = (data.data.transactions || []).map((tx: any) => ({
      hash: tx.hash || '',
      blockNumber: tx.blockNumber || 0,
      timestamp: tx.timestamp || null,
      type: tx.type || 'unknown', // buy, sell, add_liquidity, remove_liquidity
      maker: tx.maker || '',
      token0: {
        symbol: tx.token0?.symbol || '',
        amount: tx.token0Amount || '0',
        amountUSD: tx.token0AmountUSD || '0',
      },
      token1: {
        symbol: tx.token1?.symbol || '',
        amount: tx.token1Amount || '0',
        amountUSD: tx.token1AmountUSD || '0',
      },
      priceUSD: parseFloat(tx.priceUSD || '0'),
      volumeUSD: parseFloat(tx.volumeUSD || '0'),
      gasPrice: tx.gasPrice || '0',
      gasUsed: tx.gasUsed || 0,
    }));

    // Calculate statistics
    const buyCount = transactions.filter((tx: any) => tx.type === 'buy').length;
    const sellCount = transactions.filter((tx: any) => tx.type === 'sell').length;
    const totalVolumeUSD = transactions.reduce((sum: number, tx: any) => sum + tx.volumeUSD, 0);

    const txInfo = {
      chain: chain,
      address: address,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      transactions: transactions,
      statistics: {
        totalTransactions: transactions.length,
        buyCount: buyCount,
        sellCount: sellCount,
        buyPercentage: transactions.length > 0 ? (buyCount / transactions.length) * 100 : 0,
        totalVolumeUSD: totalVolumeUSD,
      },
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(txInfo, { status: 200 });
  } catch (error) {
    console.error('DEXTools transactions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
