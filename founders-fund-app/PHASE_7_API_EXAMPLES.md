# Phase 7 - Reports API Examples

## Sample API Responses

### 1. Performance Analytics API

**Request:**
```bash
GET /api/reports/performance?startDate=2024-10-01&endDate=2024-11-12&benchmark=BTC
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "portfolio": {
      "totalAllocation": 250000,
      "totalValue": 312500,
      "totalPnl": 62500,
      "portfolioReturn": 25.00,
      "realizedPnl": 40000,
      "unrealizedPnl": 22500,
      "sharpeRatio": 1.85,
      "sortinoRatio": 2.10,
      "calmarRatio": 3.25,
      "maxDrawdown": -8.5,
      "currentDrawdown": -2.3,
      "volatility": 35.2,
      "winRate": 62.5,
      "profitFactor": 1.85,
      "totalReturn": 0.25,
      "var95": -0.052,
      "cvar95": -0.068,
      "avgWin": 1250,
      "avgLoss": -850,
      "alpha": 0.15,
      "beta": 0.85
    },
    "agents": [
      {
        "agentId": "agent_001",
        "agentName": "PEPE Hunter",
        "symbol": "PEPE",
        "allocation": 12500,
        "totalValue": 18750,
        "realizedPnl": 4000,
        "unrealizedPnl": 2250,
        "totalPnl": 6250,
        "returnPercent": 50.00,
        "sharpeRatio": 2.45,
        "maxDrawdown": -12.5,
        "winRate": 68.5,
        "tradeCount": 125
      },
      {
        "agentId": "agent_002",
        "agentName": "BONK Trader",
        "symbol": "BONK",
        "allocation": 12500,
        "totalValue": 15625,
        "realizedPnl": 2000,
        "unrealizedPnl": 1125,
        "totalPnl": 3125,
        "returnPercent": 25.00,
        "sharpeRatio": 1.85,
        "maxDrawdown": -8.2,
        "winRate": 58.3,
        "tradeCount": 98
      }
      // ... 18 more agents
    ],
    "timeSeries": [
      {
        "timestamp": "2024-10-01",
        "portfolioValue": 250000,
        "realizedPnl": 0,
        "unrealizedPnl": 0
      },
      {
        "timestamp": "2024-10-02",
        "portfolioValue": 255000,
        "realizedPnl": 2500,
        "unrealizedPnl": 2500
      },
      {
        "timestamp": "2024-10-03",
        "portfolioValue": 262500,
        "realizedPnl": 5000,
        "unrealizedPnl": 7500
      }
      // ... daily snapshots
    ],
    "topPerformers": [
      {
        "agentName": "PEPE Hunter",
        "returnPercent": 50.00,
        "totalPnl": 6250
      },
      {
        "agentName": "WIF Sniper",
        "returnPercent": 42.50,
        "totalPnl": 5312
      },
      {
        "agentName": "DOGE Master",
        "returnPercent": 38.75,
        "totalPnl": 4843
      },
      {
        "agentName": "SHIB Strategist",
        "returnPercent": 32.50,
        "totalPnl": 4062
      },
      {
        "agentName": "FLOKI Finder",
        "returnPercent": 28.75,
        "totalPnl": 3593
      }
    ],
    "bottomPerformers": [
      {
        "agentName": "SAFEMOON Watcher",
        "returnPercent": -15.25,
        "totalPnl": -1906
      },
      {
        "agentName": "SQUID Detector",
        "returnPercent": -8.50,
        "totalPnl": -1062
      },
      {
        "agentName": "BABYDOGE Tracker",
        "returnPercent": -5.25,
        "totalPnl": -656
      },
      {
        "agentName": "ELON Analyzer",
        "returnPercent": 2.50,
        "totalPnl": 312
      },
      {
        "agentName": "AKITA Scout",
        "returnPercent": 5.75,
        "totalPnl": 718
      }
    ],
    "period": {
      "startDate": "2024-10-01T00:00:00.000Z",
      "endDate": "2024-11-12T23:59:59.999Z"
    }
  }
}
```

---

### 2. Risk Analytics API

**Request:**
```bash
GET /api/reports/risk?startDate=2024-10-01&endDate=2024-11-12&portfolioId=portfolio_123
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "portfolio": {
      "portfolioVolatility": 35.2,
      "var95": -5.2,
      "var99": -8.7,
      "cvar95": -6.8,
      "cvar99": -10.2,
      "concentrationRisk": 22.5,
      "liquidityScore": 3.5,
      "topHoldings": [
        {
          "agentName": "PEPE Hunter",
          "symbol": "PEPE",
          "percent": 7.5
        },
        {
          "agentName": "WIF Sniper",
          "symbol": "WIF",
          "percent": 6.25
        },
        {
          "agentName": "DOGE Master",
          "symbol": "DOGE",
          "percent": 5.85
        },
        {
          "agentName": "BONK Trader",
          "symbol": "BONK",
          "percent": 5.00
        },
        {
          "agentName": "SHIB Strategist",
          "symbol": "SHIB",
          "percent": 4.75
        }
      ]
    },
    "agents": [
      {
        "agentId": "agent_001",
        "agentName": "PEPE Hunter",
        "symbol": "PEPE",
        "allocation": 18750,
        "allocationPercent": 7.5,
        "volatility": 52.3,
        "var95": -8.5,
        "cvar95": -11.2,
        "maxDrawdown": -12.5
      },
      {
        "agentId": "agent_002",
        "agentName": "BONK Trader",
        "symbol": "BONK",
        "allocation": 12500,
        "allocationPercent": 5.0,
        "volatility": 45.8,
        "var95": -7.2,
        "cvar95": -9.5,
        "maxDrawdown": -8.2
      }
      // ... 18 more agents
    ],
    "correlationMatrix": {
      "PEPE Hunter": {
        "PEPE Hunter": 1.00,
        "BONK Trader": 0.65,
        "WIF Sniper": 0.58,
        "DOGE Master": 0.42,
        "SHIB Strategist": 0.55
      },
      "BONK Trader": {
        "PEPE Hunter": 0.65,
        "BONK Trader": 1.00,
        "WIF Sniper": 0.72,
        "DOGE Master": 0.38,
        "SHIB Strategist": 0.48
      }
      // ... full matrix
    },
    "volatilityTimeSeries": [
      {
        "day": 30,
        "volatility": 32.5
      },
      {
        "day": 31,
        "volatility": 33.2
      },
      {
        "day": 32,
        "volatility": 35.8
      },
      {
        "day": 33,
        "volatility": 34.5
      },
      {
        "day": 34,
        "volatility": 35.2
      }
    ],
    "period": {
      "startDate": "2024-10-01T00:00:00.000Z",
      "endDate": "2024-11-12T23:59:59.999Z"
    }
  }
}
```

---

### 3. Trading Analytics API

**Request:**
```bash
GET /api/reports/trading?startDate=2024-10-01&endDate=2024-11-12
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "portfolio": {
      "totalTrades": 2450,
      "buyTrades": 1225,
      "sellTrades": 1225,
      "totalVolume": 1250000,
      "totalFees": 3125,
      "avgTradeSize": 510.2,
      "avgFeePerTrade": 1.28,
      "profitableTrades": 1531,
      "losingTrades": 919,
      "winRate": 62.5
    },
    "agents": [
      {
        "agentId": "agent_001",
        "agentName": "PEPE Hunter",
        "symbol": "PEPE",
        "totalTrades": 125,
        "buyTrades": 63,
        "sellTrades": 62,
        "volume": 62500,
        "fees": 156.25,
        "avgTradeSize": 500,
        "profitableTrades": 86,
        "winRate": 68.8,
        "totalPnl": 6250
      },
      {
        "agentId": "agent_002",
        "agentName": "BONK Trader",
        "symbol": "BONK",
        "totalTrades": 98,
        "buyTrades": 49,
        "sellTrades": 49,
        "volume": 49000,
        "fees": 122.5,
        "avgTradeSize": 500,
        "profitableTrades": 57,
        "winRate": 58.2,
        "totalPnl": 3125
      }
      // ... 18 more agents
    ],
    "tokens": {
      "all": [
        {
          "symbol": "PEPE",
          "totalTrades": 125,
          "volume": 62500,
          "totalPnl": 6250,
          "avgPnl": 50,
          "winRate": 68.8
        },
        {
          "symbol": "WIF",
          "totalTrades": 110,
          "volume": 55000,
          "totalPnl": 5312,
          "avgPnl": 48.29,
          "winRate": 65.5
        }
        // ... all tokens
      ],
      "mostProfitable": [
        {
          "symbol": "PEPE",
          "totalPnl": 6250,
          "winRate": 68.8
        },
        {
          "symbol": "WIF",
          "totalPnl": 5312,
          "winRate": 65.5
        },
        {
          "symbol": "DOGE",
          "totalPnl": 4843,
          "winRate": 63.2
        },
        {
          "symbol": "SHIB",
          "totalPnl": 4062,
          "winRate": 60.5
        },
        {
          "symbol": "FLOKI",
          "totalPnl": 3593,
          "winRate": 58.8
        }
      ],
      "leastProfitable": [
        {
          "symbol": "SAFEMOON",
          "totalPnl": -1906,
          "winRate": 35.2
        },
        {
          "symbol": "SQUID",
          "totalPnl": -1062,
          "winRate": 42.5
        },
        {
          "symbol": "BABYDOGE",
          "totalPnl": -656,
          "winRate": 45.8
        },
        {
          "symbol": "ELON",
          "totalPnl": 312,
          "winRate": 51.2
        },
        {
          "symbol": "AKITA",
          "totalPnl": 718,
          "winRate": 52.5
        }
      ]
    },
    "bestAgents": [
      {
        "agentName": "PEPE Hunter",
        "symbol": "PEPE",
        "totalTrades": 125,
        "winRate": 68.8,
        "totalPnl": 6250
      },
      {
        "agentName": "WIF Sniper",
        "symbol": "WIF",
        "totalTrades": 110,
        "winRate": 65.5,
        "totalPnl": 5312
      },
      {
        "agentName": "DOGE Master",
        "symbol": "DOGE",
        "totalTrades": 102,
        "winRate": 63.2,
        "totalPnl": 4843
      },
      {
        "agentName": "SHIB Strategist",
        "symbol": "SHIB",
        "totalTrades": 95,
        "winRate": 60.5,
        "totalPnl": 4062
      },
      {
        "agentName": "FLOKI Finder",
        "symbol": "FLOKI",
        "totalTrades": 88,
        "winRate": 58.8,
        "totalPnl": 3593
      }
    ],
    "worstAgents": [
      {
        "agentName": "SAFEMOON Watcher",
        "symbol": "SAFEMOON",
        "totalTrades": 75,
        "winRate": 35.2,
        "totalPnl": -1906
      },
      {
        "agentName": "SQUID Detector",
        "symbol": "SQUID",
        "totalTrades": 68,
        "winRate": 42.5,
        "totalPnl": -1062
      },
      {
        "agentName": "BABYDOGE Tracker",
        "symbol": "BABYDOGE",
        "totalTrades": 62,
        "winRate": 45.8,
        "totalPnl": -656
      },
      {
        "agentName": "ELON Analyzer",
        "symbol": "ELON",
        "totalTrades": 58,
        "winRate": 51.2,
        "totalPnl": 312
      },
      {
        "agentName": "AKITA Scout",
        "symbol": "AKITA",
        "totalTrades": 55,
        "winRate": 52.5,
        "totalPnl": 718
      }
    ],
    "tradeFrequency": [
      {
        "date": "2024-11-06",
        "hour": 9,
        "count": 15
      },
      {
        "date": "2024-11-06",
        "hour": 10,
        "count": 22
      },
      {
        "date": "2024-11-06",
        "hour": 14,
        "count": 18
      },
      {
        "date": "2024-11-06",
        "hour": 15,
        "count": 25
      },
      {
        "date": "2024-11-07",
        "hour": 9,
        "count": 20
      }
      // ... hourly breakdown
    ],
    "volumeTimeSeries": [
      {
        "date": "2024-11-06",
        "volume": 28500
      },
      {
        "date": "2024-11-07",
        "volume": 32000
      },
      {
        "date": "2024-11-08",
        "volume": 29750
      },
      {
        "date": "2024-11-09",
        "volume": 31250
      },
      {
        "date": "2024-11-10",
        "volume": 33500
      }
    ],
    "slippage": {
      "average": 0.15,
      "total": 1875
    },
    "period": {
      "startDate": "2024-10-01T00:00:00.000Z",
      "endDate": "2024-11-12T23:59:59.999Z"
    }
  }
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden (INVESTOR accessing other's data)
```json
{
  "error": "Forbidden. Insufficient permissions."
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to calculate performance analytics",
  "details": "Error message details"
}
```

---

## Usage Examples

### cURL
```bash
# Performance Report
curl -X GET "http://localhost:3000/api/reports/performance?startDate=2024-10-01&endDate=2024-11-12&benchmark=BTC" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Risk Report
curl -X GET "http://localhost:3000/api/reports/risk?startDate=2024-10-01&endDate=2024-11-12" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Trading Report
curl -X GET "http://localhost:3000/api/reports/trading?startDate=2024-10-01&endDate=2024-11-12" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### JavaScript/TypeScript
```typescript
// Fetch Performance Report
const performanceData = await fetch(
  `/api/reports/performance?startDate=2024-10-01&endDate=2024-11-12&benchmark=BTC`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
).then(res => res.json());

// Fetch Risk Report
const riskData = await fetch(
  `/api/reports/risk?startDate=2024-10-01&endDate=2024-11-12`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
).then(res => res.json());

// Fetch Trading Report
const tradingData = await fetch(
  `/api/reports/trading?startDate=2024-10-01&endDate=2024-11-12`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
).then(res => res.json());
```

---

## TypeScript Types

```typescript
// Performance Types
interface PerformanceData {
  portfolio: PerformanceMetrics;
  agents: AgentPerformanceData[];
  timeSeries: TimeSeriesPoint[];
  topPerformers: PerformerData[];
  bottomPerformers: PerformerData[];
  period: DateRange;
}

interface PerformanceMetrics {
  totalAllocation: number;
  totalValue: number;
  totalPnl: number;
  portfolioReturn: number;
  realizedPnl: number;
  unrealizedPnl: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  volatility: number;
  winRate: number;
  profitFactor: number;
  alpha?: number;
  beta?: number;
}

// Risk Types
interface RiskData {
  portfolio: RiskMetrics;
  agents: AgentRiskData[];
  correlationMatrix: Record<string, Record<string, number>>;
  volatilityTimeSeries: VolatilityPoint[];
  period: DateRange;
}

interface RiskMetrics {
  portfolioVolatility: number;
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  concentrationRisk: number;
  liquidityScore: number;
  topHoldings: HoldingData[];
}

// Trading Types
interface TradingData {
  portfolio: TradingMetrics;
  agents: AgentTradingData[];
  tokens: TokenData;
  bestAgents: AgentPerformance[];
  worstAgents: AgentPerformance[];
  tradeFrequency: FrequencyPoint[];
  volumeTimeSeries: VolumePoint[];
  slippage: SlippageData;
  period: DateRange;
}

interface TradingMetrics {
  totalTrades: number;
  buyTrades: number;
  sellTrades: number;
  totalVolume: number;
  totalFees: number;
  avgTradeSize: number;
  avgFeePerTrade: number;
  profitableTrades: number;
  losingTrades: number;
  winRate: number;
}
```

---

## Rate Limiting

All analytics APIs are subject to rate limiting:
- **Authenticated Users:** 100 requests per minute
- **Public/Unauthenticated:** 10 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699876543
```

---

## Best Practices

1. **Date Ranges:** Use reasonable date ranges (max 1 year) to optimize performance
2. **Caching:** Results are cached for 5 minutes. Use the same query params for cache hits
3. **Pagination:** For large datasets, use date range filters to paginate
4. **Error Handling:** Always check `success` field and handle errors gracefully
5. **Authentication:** Always include valid JWT token in Authorization header
6. **Role Filtering:** INVESTOR role automatically filters to their data only

---

## Future API Enhancements

- WebSocket support for real-time updates
- Streaming responses for large datasets
- GraphQL API for flexible queries
- Batch export APIs (CSV, Excel, PDF)
- Custom metric calculations
- Saved report templates API
