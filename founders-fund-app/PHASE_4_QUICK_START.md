# Phase 4: Real-time Price Feed - Quick Start Guide

## Installation & Setup

### 1. Install Dependencies (if needed)
```bash
npm install
```

### 2. Update Environment Variables
Add to your `.env`:
```bash
DEXSCREENER_WS_URL="wss://io.dexscreener.com/dex/screener/pairs/updates"
PRICE_FEED_POLL_INTERVAL_MS=5000
PRICE_FEED_CACHE_TTL_MS=30000
PRICE_FEED_MAX_SUBSCRIPTIONS=20
```

### 3. Run Database Migration
```bash
npx prisma generate
npx prisma migrate dev --name add_price_alerts
```

### 4. Start Development Server
```bash
npm run dev
```

---

## Quick Usage Examples

### 1. Use Live Price Hook

```typescript
import { useLivePrice } from '@/hooks/useLivePrice';

function MyComponent() {
  const livePrice = useLivePrice({
    symbol: 'BONK',
    chain: 'solana',
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    enabled: true
  });

  return (
    <div>
      <p>Price: ${livePrice.price}</p>
      <p>24h Change: {livePrice.change24h}%</p>
      <p>Connected: {livePrice.isConnected ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

### 2. Add Live Agent Dashboard

```typescript
import AgentDashboardLive from '@/components/Agents/AgentDashboardLive';

function AgentsPage() {
  return <AgentDashboardLive portfolioId="your-portfolio-id" />;
}
```

### 3. Add Live Trading Chart

```typescript
import LiveTradingChart from '@/components/Charts/LiveTradingChart';

function ChartPage() {
  return (
    <LiveTradingChart
      symbol="BONK"
      chain="solana"
      address="DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
      agentId="agent-123"
      portfolioId="portfolio-123"
    />
  );
}
```

### 4. Add Price Alert Manager

```typescript
import PriceAlertManager from '@/components/Alerts/PriceAlertManager';

function AlertsPage() {
  return (
    <PriceAlertManager
      userId="user-123"
      portfolioId="portfolio-123"
    />
  );
}
```

### 5. Create Price Alert Programmatically

```typescript
import { getPriceAlertManager, createPriceAlert } from '@/lib/priceAlerts';

async function setupAlert() {
  const alertManager = getPriceAlertManager();

  const alert = await alertManager.createAlert(
    createPriceAlert.above({
      userId: 'user-123',
      symbol: 'BONK',
      chain: 'solana',
      address: 'DezXAZ...',
      price: 0.00001,
      agentId: 'agent-123'
    })
  );

  console.log('Alert created:', alert.id);
}
```

### 6. Listen for Alert Triggers

```typescript
import { getPriceAlertManager } from '@/lib/priceAlerts';

const alertManager = getPriceAlertManager();

alertManager.on('alertTriggered', (event) => {
  console.log('Alert triggered!', event.alert.message);
  // Send notification to user
});
```

---

## API Endpoints

### Get All Alerts
```bash
GET /api/alerts?userId=user123&activeOnly=true
```

### Create Alert
```bash
POST /api/alerts
Content-Type: application/json

{
  "userId": "user123",
  "symbol": "BONK",
  "chain": "solana",
  "address": "DezXAZ...",
  "condition": "ABOVE",
  "threshold": 0.00001,
  "message": "BONK hit target!"
}
```

### Update Alert
```bash
PATCH /api/alerts/alert123
Content-Type: application/json

{
  "isActive": false
}
```

### Delete Alert
```bash
DELETE /api/alerts/alert123
```

---

## Alert Conditions

| Condition | Description | Threshold |
|-----------|-------------|-----------|
| `ABOVE` | Price goes above value | Dollar amount |
| `BELOW` | Price goes below value | Dollar amount |
| `CHANGE_UP` | Price increases by % | Percentage |
| `CHANGE_DOWN` | Price decreases by % | Percentage |

---

## Component Props

### AgentDashboardLive
```typescript
interface AgentDashboardLiveProps {
  portfolioId: string;
}
```

### LiveTradingChart
```typescript
interface LiveTradingChartProps {
  symbol: string;
  chain: string;
  address: string;
  agentId?: string;
  portfolioId?: string;
}
```

### PriceAlertManager
```typescript
interface PriceAlertManagerProps {
  userId: string;
  portfolioId?: string;
  agentId?: string;
  symbol?: string;
  chain?: string;
  address?: string;
}
```

---

## Common Issues

### WebSocket Not Connecting
- Check browser console for errors
- Verify DEXSCREENER_WS_URL in .env
- System automatically falls back to HTTP polling

### Prices Not Updating
- Ensure token has `chain` and `address`
- Check token is actively traded
- Manually refresh: `priceFeed.refreshPrices()`

### High Memory Usage
- Limit subscriptions to <20 tokens
- Call `priceFeed.clearCache()` periodically
- Ensure proper cleanup on unmount

---

## Performance Tips

1. **Limit Subscriptions**: Max 20 simultaneous tokens
2. **Use Caching**: Default 30-second TTL
3. **Batch Updates**: Group UI updates with debouncing
4. **Clean Up**: Always unsubscribe on unmount
5. **Monitor Memory**: Check browser DevTools

---

## Testing

### Test in Browser Console
```javascript
// Get price feed instance
const priceFeed = window.__priceFeed ||
  require('@/lib/websocket/clientPriceFeed').getClientPriceFeed();

// Subscribe to token
priceFeed.subscribe({
  symbol: 'BONK',
  chain: 'solana',
  address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
});

// Listen for updates
priceFeed.on('price:BONK', (update) => {
  console.log('Price:', update.price);
  console.log('Change 24h:', update.change24h);
});
```

---

## File Structure

```
src/
├── lib/
│   ├── websocket/
│   │   ├── priceFeed.ts              # WebSocket manager
│   │   └── clientPriceFeed.ts        # Client price feed
│   └── priceAlerts.ts                # Alert system
├── hooks/
│   └── useLivePrice.ts               # React hooks
├── components/
│   ├── Agents/
│   │   ├── AgentCardLive.tsx
│   │   └── AgentDashboardLive.tsx
│   ├── Charts/
│   │   └── LiveTradingChart.tsx
│   └── Alerts/
│       └── PriceAlertManager.tsx
└── app/api/alerts/
    ├── route.ts
    └── [alertId]/route.ts
```

---

## Next Steps

1. Deploy to production
2. Run database migrations
3. Update component imports
4. Configure monitoring
5. Test with real tokens
6. Set up Phase 9A notifications

---

For detailed documentation, see:
- `PHASE_4_REALTIME_PRICE_FEED.md` - Full technical docs
- `PHASE_4_IMPLEMENTATION_REPORT.md` - Implementation details
