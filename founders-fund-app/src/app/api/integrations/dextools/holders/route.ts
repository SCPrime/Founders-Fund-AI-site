import { NextRequest, NextResponse } from 'next/server';

const DEXTOOLS_BASE_URL = 'https://api.dextools.io/v2';

/**
 * GET /api/integrations/dextools/holders
 * Get holder distribution for a token from DEXTools
 *
 * Query params:
 * - chain: blockchain network (e.g., 'ether', 'bsc', 'polygon')
 * - address: token contract address
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

    // Call DEXTools API
    const url = `${DEXTOOLS_BASE_URL}/token/${chain}/${address}/holders?page=${page}&pageSize=${pageSize}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': apiKey,
      },
      next: { revalidate: 120 }, // Cache for 120 seconds (holder data changes slowly)
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

    // Calculate distribution metrics
    const holders = data.data.holders || [];
    const totalHolders = data.data.totalHolders || holders.length;

    let top10Supply = 0;
    let top50Supply = 0;
    let top100Supply = 0;

    holders.forEach((holder: any, index: number) => {
      const percentage = parseFloat(holder.percentage || '0');
      if (index < 10) top10Supply += percentage;
      if (index < 50) top50Supply += percentage;
      if (index < 100) top100Supply += percentage;
    });

    const holdersInfo = {
      chain: chain,
      address: address,
      totalHolders: totalHolders,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      holders: holders.map((holder: any) => ({
        address: holder.address || '',
        balance: holder.balance || '0',
        percentage: parseFloat(holder.percentage || '0'),
        isContract: holder.isContract || false,
        tag: holder.tag || null,
      })),
      distribution: {
        top10Percentage: top10Supply,
        top50Percentage: top50Supply,
        top100Percentage: top100Supply,
      },
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(holdersInfo, { status: 200 });
  } catch (error) {
    console.error('DEXTools holders API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
