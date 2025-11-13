# Advanced Charting System - Phase 5

Professional-grade charting infrastructure with technical indicators for the Founders Fund AI trading platform.

## Overview

This module provides TradingView-quality charting capabilities with 8+ technical indicators, drawing tools, portfolio visualization, and comprehensive financial metrics.

## Features

### 1. Full-Screen Chart Component
- **TradingView Lightweight Charts** integration
- F11 fullscreen mode
- Dark/light theme support
- Zoom, pan, and fit controls
- Responsive design

### 2. Technical Indicators

#### Trend Indicators
- **Ichimoku Cloud**: Complete 5-component cloud (Tenkan, Kijun, Senkou A/B, Chikou)
- **Moving Averages**: SMA, EMA, WMA with customizable periods

#### Momentum Indicators
- **RSI**: Relative Strength Index with overbought/oversold lines
- **MACD**: Moving Average Convergence Divergence with histogram
- **Stochastic Oscillator**: %K and %D lines

#### Volatility Indicators
- **Bollinger Bands**: Upper, middle, lower bands
- **ATR**: Average True Range

#### Volume Indicators
- **Volume Profile**: Price level distribution

### 3. UI Controls

#### Indicator Selector
- Toggle indicators on/off
- Save/load preferences (localStorage)
- Parameter configuration
- Reset functionality

#### Time Frame Selector
- 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M
- Visual active state
- Ready for candle aggregation

#### Drawing Tools
- Trend lines
- Horizontal/Vertical lines
- Fibonacci retracements
- Support/resistance zones
- Text annotations
- Rectangles and arrows
- Save to database

### 4. Portfolio Charts (Recharts)

- **Portfolio Value Chart**: Line chart of total value over time
- **Allocation Chart**: Stacked area showing breakdown by agent
- **PnL Chart**: Dual-axis chart (realized vs unrealized)
- **Agent Comparison Chart**: Multi-line comparison of agent performance

### 5. Financial Metrics Dashboard

Calculates and displays:
- **Risk Metrics**: Sharpe Ratio, Sortino Ratio, Max Drawdown, Calmar Ratio
- **Performance Metrics**: Win Rate, Profit Factor, Total Return, Volatility
- **Market Metrics**: Alpha, Beta (requires benchmark)
- **Trade Metrics**: Avg Win, Avg Loss, Total Trades

## Component Structure

```
Charts/
├── index.ts                          # Main exports
├── types.ts                          # TypeScript interfaces
├── README.md                         # This file
├── FullScreenChart.tsx               # Main chart component
├── IndicatorSelector.tsx             # Indicator panel
├── TimeFrameSelector.tsx             # Time frame buttons
├── DrawingTools.tsx                  # Drawing tools
├── TradingDashboard.tsx              # Complete demo
├── utils/
│   └── indicatorCalculations.ts      # All calculations
├── Indicators/
│   ├── IchimokuIndicator.tsx
│   ├── MovingAverages.tsx
│   ├── RSIIndicator.tsx
│   ├── MACDIndicator.tsx
│   ├── BollingerBands.tsx
│   ├── StochasticIndicator.tsx
│   └── ATRIndicator.tsx
├── Portfolio/
│   ├── PortfolioValueChart.tsx
│   ├── AllocationChart.tsx
│   ├── PnLChart.tsx
│   └── AgentComparisonChart.tsx
└── Metrics/
    └── MetricsPanel.tsx
```

## Usage Examples

### Basic Chart with Indicators

```tsx
import { FullScreenChart, IndicatorSelector } from '@/components/Charts';
import { useState } from 'react';

function TradingPage() {
  const [indicators, setIndicators] = useState([]);

  return (
    <>
      <IndicatorSelector onIndicatorsChange={setIndicators} />
      <FullScreenChart
        data={candleData}
        indicators={indicators}
        theme="dark"
      />
    </>
  );
}
```

### Portfolio Charts

```tsx
import {
  PortfolioValueChart,
  AllocationChart,
  PnLChart
} from '@/components/Charts';

function DashboardPage() {
  return (
    <>
      <PortfolioValueChart data={portfolioData} />
      <AllocationChart data={portfolioData} />
      <PnLChart data={portfolioData} />
    </>
  );
}
```

### Financial Metrics

```tsx
import { MetricsPanel } from '@/components/Charts';

function MetricsPage() {
  const returns = [0.02, -0.01, 0.03, 0.01, -0.005]; // daily returns

  return (
    <MetricsPanel
      returns={returns}
      riskFreeRate={0.02}
      theme="dark"
    />
  );
}
```

### Complete Trading Dashboard

```tsx
import { TradingDashboard } from '@/components/Charts';

function TradingApp() {
  return (
    <TradingDashboard
      agentId="agent-123"
      portfolioId="portfolio-456"
    />
  );
}
```

## Data Formats

### Candle Data
```typescript
interface CandleData {
  time: Time;        // Unix timestamp or date string
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}
```

### Portfolio Data
```typescript
interface PortfolioDataPoint {
  timestamp: string;
  totalValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  agentValues?: Record<string, number>;
}
```

### Agent Performance Data
```typescript
interface AgentPerformanceData {
  agentId: string;
  agentName: string;
  data: Array<{
    timestamp: string;
    value: number;
    pnl: number;
  }>;
}
```

## Database Integration

### Chart Drawings

The `ChartDrawing` model in Prisma schema:

```prisma
model ChartDrawing {
  id          String   @id @default(cuid())
  userId      String
  portfolioId String?
  agentId     String?
  drawingData Json
  timestamp   DateTime @default(now())
}
```

### Required API Routes

Create these API endpoints:

**POST /api/chart-drawings**
```typescript
// Save drawings
body: {
  portfolioId?: string;
  agentId?: string;
  drawings: DrawingTool[];
}
```

**GET /api/chart-drawings**
```typescript
// Load drawings
query: {
  portfolioId?: string;
  agentId?: string;
}
```

## Dependencies

```json
{
  "lightweight-charts": "^5.0.9",
  "technicalindicators": "^3.1.0",
  "recharts": "^3.4.1"
}
```

## Technical Details

### Indicator Calculations

All indicators use professional algorithms from the `technicalindicators` library:
- SMA, EMA, WMA: Standard moving average formulas
- RSI: Wilder's smoothing method
- MACD: EMA-based with configurable periods
- Bollinger Bands: Standard deviation-based bands
- Stochastic: %K and %D with configurable smoothing

### Ichimoku Cloud

Custom implementation with standard parameters:
- Tenkan-sen (Conversion Line): 9 periods
- Kijun-sen (Base Line): 26 periods
- Senkou Span A: (Tenkan + Kijun) / 2, displaced 26 periods
- Senkou Span B: 52 period midpoint, displaced 26 periods
- Chikou Span: Close price, displaced -26 periods

### Financial Metrics

- **Sharpe Ratio**: (Return - Risk-free Rate) / Volatility
- **Sortino Ratio**: (Return - Risk-free Rate) / Downside Deviation
- **Max Drawdown**: Largest peak-to-trough decline
- **Calmar Ratio**: Annual Return / Max Drawdown
- **Win Rate**: Percentage of profitable trades
- **Profit Factor**: Gross Profit / Gross Loss

## Performance

- Lightweight Charts: Hardware-accelerated canvas rendering
- Indicator calculations: O(n) time complexity for most indicators
- Memoized calculations to prevent re-renders
- Efficient data structures for time-series data

## Theming

Both light and dark themes are supported:

```typescript
const darkTheme = {
  background: '#1e222d',
  textColor: '#d1d4dc',
  gridColor: '#2b2b43',
  crosshairColor: '#758696',
  upColor: '#26a69a',
  downColor: '#ef5350',
};
```

## Future Enhancements

- [ ] WebSocket integration for real-time data
- [ ] Time frame aggregation (e.g., 1m → 5m candles)
- [ ] Advanced drawing tools (Gann fan, Elliott Wave)
- [ ] Custom indicator builder
- [ ] Alert system for price levels/indicators
- [ ] Chart snapshots and sharing
- [ ] Multi-chart layouts
- [ ] Strategy backtesting integration

## Testing

Test with sample data:
```typescript
import { generateSampleData } from './TradingDashboard';

const testData = generateSampleData(200); // 200 candles
```

## Contributing

When adding new indicators:
1. Create component in `Indicators/`
2. Add calculation to `utils/indicatorCalculations.ts`
3. Add to `IndicatorSelector.tsx` list
4. Export from `index.ts`
5. Add TypeScript types to `types.ts`

## License

Part of the Founders Fund AI trading platform.

---

**Built by MOD SQUAD Agent #5 - Phase 5 Complete**
