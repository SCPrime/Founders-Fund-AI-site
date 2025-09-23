# Trading Bot Dev Notes

## Performance Snapshot
**Date:** Aug 26, 2025
- **Total Value:** $26,005
- **30d PNL:** +$6,020 (~30% growth)
- **Unrealized PNL:** +$52 (flat open risk)
- **Available Balance:** $25,952
- **Win/Loss (30d):** 2,190 / 913 (~70% win rate)
- **Trades executed:** 3,103
- **Equity curve:** steady climb, no major drawdowns

## Status Checks
✅ Risk manager working (no >5% daily loss days hit)
✅ Position sizing appears balanced
✅ OCR PNL extraction API deployed: https://founders-fund-8a160pzf7-scprimes-projects.vercel.app/api/pnl-extract
✅ Win rate maintaining above 65% target

## Next Tasks
🔜 Add Discord/Slack notifications when daily PNL breaches +5% or -2%
🔜 Backtest MACD vs RSI for volatility filter
🔜 Implement automated portfolio rebalancing
🔜 Create performance analytics dashboard

## Questions & Research
❓ Should I throttle trades-per-day to reduce fees? (3k+ trades/mo is high)
❓ Test smaller position sizes during high volatility periods?
❓ Add maximum daily trades limit (100/day cap?)

## Code Changes
- **PNL Extraction API:** Created `/api/pnl-extract` endpoint using OpenAI GPT-4o Vision
- **OCR Integration:** Fixed initialization errors in production deployment
- **Error Handling:** Added conditional API client initialization for Vercel

## Risk Management Notes
- Current drawdown control: ✅ Working
- Position sizing: 1-2% risk per trade
- Daily loss limit: -2% account value
- Max concurrent positions: 10

## Performance Metrics to Track
- [ ] Sharpe ratio calculation
- [ ] Maximum drawdown periods
- [ ] Profit factor (gross profit / gross loss)
- [ ] Average trade duration
- [ ] Best/worst performing hours of day

---
*Last Updated: $(date)*