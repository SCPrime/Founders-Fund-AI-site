import { NextRequest, NextResponse } from 'next/server';

const COINBASE_BASE_URL = 'https://api.coinbase.com/v2';

/**
 * GET /api/integrations/coinbase/prices
 * Get prices for cryptocurrencies from Coinbase (fallback price source)
 *
 * Query params:
 * - currency: currency pair (e.g., 'BTC-USD', 'ETH-USD', 'SOL-USD')
 * - type: (optional) 'spot', 'buy', or 'sell' (default: 'spot')
 *
 * Note: This is a public API and doesn't require authentication for price data
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const currency = searchParams.get('currency');
    const type = searchParams.get('type') || 'spot';

    if (!currency) {
      return NextResponse.json(
        { error: 'Missing required parameter: currency (e.g., BTC-USD)' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['spot', 'buy', 'sell'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be: spot, buy, or sell' },
        { status: 400 }
      );
    }

    // Call Coinbase API
    const url = `${COINBASE_BASE_URL}/prices/${currency}/${type}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 30 }, // Cache for 30 seconds
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Coinbase API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Coinbase API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.data) {
      return NextResponse.json(
        { error: 'Invalid response from Coinbase API' },
        { status: 500 }
      );
    }

    const priceInfo = {
      currency: data.data.base || currency.split('-')[0],
      quoteCurrency: data.data.currency || currency.split('-')[1] || 'USD',
      price: parseFloat(data.data.amount || '0'),
      type: type,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(priceInfo, { status: 200 });
  } catch (error) {
    console.error('Coinbase prices API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
