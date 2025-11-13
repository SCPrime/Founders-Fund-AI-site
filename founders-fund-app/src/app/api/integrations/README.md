# External API Integrations - Phase 8

This directory contains integrations with external cryptocurrency data providers.

## Overview

The integration system provides a unified interface for fetching real-time crypto prices and data from multiple sources with automatic fallback mechanisms.

### Data Sources

1. **DexScreener** - Primary source for DEX tokens
2. **DEXTools** - Alternative DEX source with holder analysis
3. **Coinbase** - Fallback for major tokens

## API Endpoints

### DexScreener Integration

#### GET /api/integrations/dexscreener/price
Get current price for a token.

**Query Parameters:**
- `chain` - Blockchain network (e.g., 'ethereum', 'solana', 'bsc')
- `address` - Token contract address

**Response:**
```json
{
  "price": 0.000123,
  "priceNative": 0.000000045,
  "volume24h": 123456.78,
  "liquidity": 500000,
  "priceChange24h": 15.5,
  "pairAddress": "0x...",
  "dexId": "uniswap",
  "symbol": "TOKEN",
  "name": "Token Name",
  "chain": "ethereum",
  "lastUpdated": "2025-11-12T..."
}
```

#### GET /api/integrations/dexscreener/chart
Get chart data and trading metrics.

**Query Parameters:**
- `chain` - Blockchain network
- `address` - Token contract address
- `pairAddress` - (optional) Specific pair address

#### GET /api/integrations/dexscreener/pairs
Get all trading pairs and liquidity info.

**Query Parameters:**
- `chain` - Blockchain network
- `address` - Token contract address

### DEXTools Integration

**Note:** Requires `DEXTOOLS_API_KEY` environment variable.

#### GET /api/integrations/dextools/token-info
Get token metadata and information.

**Query Parameters:**
- `chain` - Blockchain network (e.g., 'ether', 'bsc', 'polygon')
- `address` - Token contract address

#### GET /api/integrations/dextools/holders
Get holder distribution analysis.

**Query Parameters:**
- `chain` - Blockchain network
- `address` - Token contract address
- `page` - (optional) Page number (default: 1)
- `pageSize` - (optional) Items per page (default: 50)

**Response:**
```json
{
  "totalHolders": 1234,
  "holders": [...],
  "distribution": {
    "top10Percentage": 45.5,
    "top50Percentage": 78.3,
    "top100Percentage": 89.2
  }
}
```

#### GET /api/integrations/dextools/transactions
Get recent trades and transaction history.

**Query Parameters:**
- `chain` - Blockchain network
- `address` - Pair address
- `page` - (optional) Page number
- `pageSize` - (optional) Items per page

### Coinbase Integration

#### GET /api/integrations/coinbase/prices
Get prices for major cryptocurrencies (fallback source).

**Query Parameters:**
- `currency` - Currency pair (e.g., 'BTC-USD', 'ETH-USD')
- `type` - (optional) 'spot', 'buy', or 'sell' (default: 'spot')

**Response:**
```json
{
  "currency": "BTC",
  "quoteCurrency": "USD",
  "price": 43210.50,
  "type": "spot",
  "lastUpdated": "2025-11-12T..."
}
```

#### GET /api/integrations/coinbase/accounts
Get account balances (optional, requires authentication).

**Note:** Requires `COINBASE_API_KEY` and `COINBASE_API_SECRET`.

## Unified Price Feed Service

Location: `src/lib/priceFeed.ts`

### Usage

```typescript
import { getPriceFeed } from '@/lib/priceFeed';

const priceFeed = getPriceFeed();

// Get single price
const price = await priceFeed.getPrice({
  symbol: 'VIRTUAL',
  chain: 'ethereum',
  address: '0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b',
  coinbasePair: 'VIRTUAL-USD', // fallback
});

// Get multiple prices
const prices = await priceFeed.getPrices([
  { symbol: 'VIRTUAL', chain: 'ethereum', address: '0x...' },
  { symbol: 'AIXBT', chain: 'ethereum', address: '0x...' },
]);
```

### Features

- **Automatic Fallback**: Tries DexScreener → DEXTools → Coinbase
- **Caching**: 30-second TTL to reduce API calls
- **Error Handling**: Graceful degradation when sources are unavailable
- **Rate Limiting**: Built-in timeout and retry logic

## React Components

Location: `src/components/Integrations/`

### DexScreenerWidget

Embedded chart and real-time price display.

```tsx
import DexScreenerWidget from '@/components/Integrations/DexScreenerWidget';

<DexScreenerWidget
  chain="ethereum"
  address="0x..."
  theme="dark"
  height={500}
/>
```

### DEXToolsPanel

Token holder analysis and distribution.

```tsx
import DEXToolsPanel from '@/components/Integrations/DEXToolsPanel';

<DEXToolsPanel
  chain="ether"
  address="0x..."
  theme="dark"
/>
```

### PriceDisplay

Real-time price ticker with auto-update.

```tsx
import PriceDisplay from '@/components/Integrations/PriceDisplay';

<PriceDisplay
  token={{
    symbol: 'VIRTUAL',
    chain: 'ethereum',
    address: '0x...',
  }}
  showDetails={true}
  theme="dark"
/>
```

## Background Price Updates

### Cron Job

Location: `/api/jobs/update-prices`

Automatically updates all agent prices every 30 seconds.

**Configuration:** See `vercel.json` crons section.

**Manual Trigger:**
```bash
POST /api/jobs/update-prices?key=YOUR_CRON_SECRET
```

### Client-side Scheduler

Location: `src/lib/priceUpdateScheduler.ts`

For development or client-side updates:

```typescript
import { getPriceScheduler } from '@/lib/priceUpdateScheduler';

const scheduler = getPriceScheduler();
scheduler.start(); // Start auto-updates
scheduler.stop(); // Stop auto-updates
```

## Environment Variables

Required for full functionality:

```env
# DEXTools (optional but recommended)
DEXTOOLS_API_KEY=your_key_here

# Coinbase (optional, for fallback)
COINBASE_API_KEY=your_key_here
COINBASE_API_SECRET=your_secret_here

# Cron job security
CRON_SECRET=random_secret_key
```

## Error Handling

All endpoints implement:

1. **Rate Limiting**: Respects API provider limits
2. **Timeout Handling**: 10-second timeout per request
3. **Graceful Degradation**: Falls back to next available source
4. **Error Logging**: Detailed error messages for debugging
5. **Service Checks**: Returns 503 when API keys are missing

## Rate Limits

- **DexScreener**: 300 requests/minute (public)
- **DEXTools**: Varies by plan (typically 300-1000/minute)
- **Coinbase**: 10,000 requests/hour (public), varies for authenticated

## Testing

```bash
# Test DexScreener
curl "http://localhost:3000/api/integrations/dexscreener/price?chain=ethereum&address=0x..."

# Test price feed
curl "http://localhost:3000/api/jobs/update-prices"

# Check cache stats
curl "http://localhost:3000/api/jobs/update-prices"
```

## Monitoring

Check cache statistics:
```typescript
const priceFeed = getPriceFeed();
const stats = priceFeed.getCacheStats();
console.log(stats); // { size: 10, entries: [...] }
```

## Future Enhancements

- WebSocket support for real-time updates
- Historical price data storage
- Advanced charting with TradingView
- Multi-chain aggregation
- Price alerts and notifications
- Portfolio tracking integration

## Support

For API issues:
- DexScreener: https://docs.dexscreener.com
- DEXTools: https://developer.dextools.io
- Coinbase: https://docs.cloud.coinbase.com
