import { NextRequest, NextResponse } from 'next/server';

const DEXTOOLS_BASE_URL = 'https://api.dextools.io/v2';

/**
 * GET /api/integrations/dextools/token-info
 * Get token metadata from DEXTools
 *
 * Query params:
 * - chain: blockchain network (e.g., 'ether', 'bsc', 'polygon')
 * - address: token contract address
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

    if (!chain || !address) {
      return NextResponse.json(
        { error: 'Missing required parameters: chain and address' },
        { status: 400 }
      );
    }

    // Call DEXTools API
    const url = `${DEXTOOLS_BASE_URL}/token/${chain}/${address}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': apiKey,
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
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

    const tokenInfo = {
      address: data.data.address || address,
      name: data.data.name || '',
      symbol: data.data.symbol || '',
      decimals: data.data.decimals || 18,
      totalSupply: data.data.totalSupply || '0',
      circulatingSupply: data.data.circulatingSupply || '0',
      holders: data.data.holders || 0,
      logo: data.data.logo || null,
      audit: data.data.audit || null,
      auditInfoUrl: data.data.auditInfoUrl || null,
      links: {
        website: data.data.links?.website || null,
        twitter: data.data.links?.twitter || null,
        telegram: data.data.links?.telegram || null,
        discord: data.data.links?.discord || null,
      },
      metrics: {
        maxSupply: data.data.metrics?.maxSupply || null,
        totalSupply: data.data.metrics?.totalSupply || null,
        circulatingSupply: data.data.metrics?.circulatingSupply || null,
        holders: data.data.metrics?.holders || 0,
        txCount: data.data.metrics?.txCount || 0,
      },
      creationTime: data.data.creationTime || null,
      creationBlock: data.data.creationBlock || null,
      reprPair: data.data.reprPair || null,
      chain: chain,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(tokenInfo, { status: 200 });
  } catch (error) {
    console.error('DEXTools token-info API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
