import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const COINBASE_BASE_URL = 'https://api.coinbase.com/v2';

/**
 * GET /api/integrations/coinbase/accounts
 * Get account balances from Coinbase (optional feature)
 *
 * Note: Requires COINBASE_API_KEY and COINBASE_API_SECRET environment variables
 * This endpoint is optional and requires user authentication setup
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.COINBASE_API_KEY;
    const apiSecret = process.env.COINBASE_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        {
          error: 'Coinbase API credentials not configured',
          message: 'Set COINBASE_API_KEY and COINBASE_API_SECRET environment variables',
        },
        { status: 503 }
      );
    }

    // Generate authentication headers
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'GET';
    const path = '/v2/accounts';
    const body = '';

    // Create signature
    const message = timestamp + method + path + body;
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(message)
      .digest('hex');

    // Call Coinbase API
    const url = `${COINBASE_BASE_URL}/accounts`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'CB-ACCESS-KEY': apiKey,
        'CB-ACCESS-SIGN': signature,
        'CB-ACCESS-TIMESTAMP': timestamp,
        'CB-VERSION': '2025-11-12',
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
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

    // Format account data
    const accounts = data.data.map((account: any) => ({
      id: account.id || '',
      name: account.name || '',
      currency: account.currency || '',
      balance: parseFloat(account.balance?.amount || '0'),
      balanceCurrency: account.balance?.currency || '',
      type: account.type || 'wallet',
      isPrimary: account.primary || false,
      nativeBalance: {
        amount: parseFloat(account.native_balance?.amount || '0'),
        currency: account.native_balance?.currency || 'USD',
      },
    }));

    // Calculate total balance in USD
    const totalBalanceUSD = accounts.reduce((sum: number, account: any) => {
      return sum + account.nativeBalance.amount;
    }, 0);

    return NextResponse.json({
      accounts,
      totalAccounts: accounts.length,
      totalBalanceUSD,
      lastUpdated: new Date().toISOString(),
    }, { status: 200 });
  } catch (error) {
    console.error('Coinbase accounts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
