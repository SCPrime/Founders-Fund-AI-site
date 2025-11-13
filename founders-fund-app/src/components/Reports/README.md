# PDF Export System Documentation

## Overview

The PDF Export System provides professional PDF generation and export capabilities for all report types in the Founders Fund AI Trading Platform. This system ensures privacy-safe individual investor reports while providing comprehensive portfolio and agent performance analytics.

## Features

- **Professional PDF Generation**: High-quality, branded PDF reports with proper typography and styling
- **Privacy-Safe Individual Reports**: Individual investor reports show only their data, hiding other investors
- **Multiple Report Types**: Support for 4 distinct report types
- **Easy Integration**: Reusable React components and API endpoints
- **Automatic Download**: Client-side download with proper filenames
- **Error Handling**: Comprehensive error handling and user feedback

## Report Types

### 1. Individual Investor Report (Privacy-Safe)
Shows ONLY the individual investor's:
- Contributions and entry fees
- Dollar-days accumulated
- Portfolio share percentage
- Realized gross/net returns
- Management fees paid
- Moonbag (unrealized) allocation
- End capital position
- ROI calculation
- **Privacy Notice**: Other investor data is completely hidden

### 2. Portfolio Performance Report
Complete portfolio overview including:
- Total profit (realized/unrealized)
- Wallet size and dollar-days
- All participants summary table
- Fee structure details
- Summary statistics

### 3. Agent Performance Report
Detailed agent analytics:
- Performance metrics (win rate, total profit, avg return)
- Trade history (last 20 trades)
- Best/worst trade analysis
- Average hold time

### 4. Agent Comparison Report
Side-by-side agent comparison:
- Performance metrics for all agents
- Rankings by profit
- Best/worst performers
- System-wide statistics

## Architecture

### Components

```
src/components/Reports/
├── ExportPDFButton.tsx          # Reusable export button component
├── PDFTemplates/
│   ├── IndividualInvestorPDF.tsx
│   ├── PortfolioPerformancePDF.tsx
│   ├── AgentPerformancePDF.tsx
│   ├── AgentComparisonPDF.tsx
│   └── index.ts
├── index.ts
└── README.md
```

### Services

```
src/lib/pdfGenerator.ts          # Core PDF generation service
```

### API

```
src/app/api/reports/export-pdf/
└── route.ts                     # PDF export API endpoint
```

## Usage

### 1. Using the ExportPDFButton Component

#### Portfolio Performance Report
```tsx
import { ExportPDFButton } from '@/components/Reports';

<ExportPDFButton
  reportType="portfolio-performance"
  allocationState={state}
  allocationOutputs={outputs}
  label="Export Portfolio PDF"
/>
```

#### Individual Investor Report
```tsx
<ExportPDFButton
  reportType="individual-investor"
  allocationState={state}
  allocationOutputs={outputs}
  investorName="John Doe"
  label="Export My Report"
/>
```

#### Agent Performance Report
```tsx
<ExportPDFButton
  reportType="agent-performance"
  data={{
    agentName: 'GPT-4 Trader',
    window: { start: '2024-01-01', end: '2024-12-31' },
    totalTrades: 100,
    profitableTrades: 65,
    totalProfit: 50000,
    winRate: 65,
    averageReturn: 5.2,
    trades: [...],
    performance: {
      bestTrade: 5000,
      worstTrade: -2000,
      averageHoldTime: '2.5 days'
    }
  }}
  label="Export Agent Report"
/>
```

#### Agent Comparison Report
```tsx
<ExportPDFButton
  reportType="agent-comparison"
  data={{
    window: { start: '2024-01-01', end: '2024-12-31' },
    agents: [...],
    summary: {
      bestPerformer: 'GPT-4 Trader',
      worstPerformer: 'Basic Bot',
      totalSystemProfit: 150000,
      avgSystemWinRate: 62.5
    }
  }}
  label="Export Comparison"
/>
```

### 2. Using the API Directly

```typescript
const response = await fetch('/api/reports/export-pdf', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    reportType: 'individual-investor',
    investorName: 'John Doe',
    allocationState: { ... },
    allocationOutputs: { ... },
    filename: 'my-report.pdf',
    returnAs: 'blob' // or 'base64' or 'buffer'
  }),
});

const blob = await response.blob();
// Handle the PDF blob
```

### 3. Using the PDFGenerator Service Directly

```typescript
import { PDFGenerator, generateIndividualInvestorReportFromAllocation } from '@/lib/pdfGenerator';

// Option 1: Use helper function
const pdfDoc = generateIndividualInvestorReportFromAllocation(
  'John Doe',
  allocationState,
  allocationOutputs
);
pdfDoc.save('investor-report.pdf');

// Option 2: Use PDFGenerator class
const generator = new PDFGenerator();
const pdfDoc = generator.generatePortfolioPerformanceReport(data);
const blob = pdfDoc.output('blob');
```

## Integration Points

### Current Integrations

1. **Allocation Results Page**
   - Portfolio performance export button (top-right)
   - Individual investor export buttons (per-investor in table)

### Recommended Future Integrations

1. **Agent Dashboard**
   - Agent performance export buttons for each agent
   - Agent comparison export for selected agents

2. **Agent Detail Pages**
   - Individual agent report export

3. **Portfolio Overview**
   - Portfolio performance report export

4. **Email Delivery** (Future)
   - Automated email delivery of reports
   - Scheduled reports (daily/weekly/monthly)

## API Reference

### POST /api/reports/export-pdf

**Request Body:**
```typescript
{
  reportType: 'individual-investor' | 'portfolio-performance' | 'agent-performance' | 'agent-comparison';
  data?: object;                    // Report-specific data
  allocationState?: AllocationState;
  allocationOutputs?: AllocationOutputs;
  investorName?: string;            // For individual reports
  filename?: string;                // Optional custom filename
  returnAs?: 'blob' | 'base64' | 'buffer';
}
```

**Response:**
- Default: Binary PDF file with appropriate headers
- base64/buffer: JSON response with encoded data

### GET /api/reports/export-pdf

Returns API documentation and usage examples.

## Styling and Branding

### Brand Colors
- Primary: #2563eb (Blue)
- Secondary: #16a34a (Green)
- Danger: #dc2626 (Red)
- Warning: #f59e0b (Amber)
- Muted: #6b7280 (Gray)

### Typography
- Title: 20pt bold
- Heading: 14pt bold
- Subheading: 12pt bold
- Body: 10pt normal
- Small: 8pt normal

### Features
- Multi-page support with automatic page breaks
- Headers and footers with page numbers
- Professional table formatting with alternating row colors
- Proper spacing and alignment
- Color-coded values (positive/negative/warning)

## Privacy and Security

### Individual Investor Reports
- **Privacy-First Design**: Only shows the specific investor's data
- **No Cross-Contamination**: Other investor information is completely excluded
- **Privacy Notice**: Each report includes a privacy notice explaining the data scope
- **Secure Generation**: Server-side generation prevents data leakage

### Best Practices
1. Always validate investor name before generating reports
2. Never expose complete portfolio data in individual reports
3. Implement access control at the API level
4. Consider adding authentication for sensitive reports

## Performance Considerations

### Optimization Tips
1. **Chart Conversion**: For including charts, use lightweight image formats (PNG/JPEG)
2. **Large Tables**: Consider pagination for reports with 100+ rows
3. **Caching**: Cache generated PDFs for identical requests
4. **Async Generation**: For large reports, consider background job processing

### Current Limitations
- Chart embedding not yet implemented (placeholder for future)
- Maximum 20 trades shown in agent performance report
- Single-page portfolio reports (may need pagination for 50+ participants)

## Dependencies

- **jspdf**: Core PDF generation library (already installed)
- **jspdf-autotable**: Table generation plugin (already installed)
- **@react-pdf/renderer**: React-based PDF templates (newly installed)
- **puppeteer**: HTML to PDF conversion capability (newly installed)

## Testing

### Manual Testing
1. Navigate to allocation results page
2. Click "Export Portfolio PDF" button
3. Verify PDF downloads with correct filename
4. Open PDF and verify:
   - Proper formatting
   - Accurate data
   - Page numbers and timestamps
   - Branding elements

### Unit Testing (Future)
```typescript
import { PDFGenerator } from '@/lib/pdfGenerator';

describe('PDFGenerator', () => {
  it('generates individual investor report', () => {
    const generator = new PDFGenerator();
    const pdf = generator.generateIndividualInvestorReport(testData);
    expect(pdf).toBeDefined();
  });
});
```

## Troubleshooting

### Common Issues

**Issue: PDF not downloading**
- Check browser console for errors
- Verify API endpoint is accessible
- Check Content-Disposition headers

**Issue: Blank or malformed PDF**
- Verify data structure matches expected types
- Check for missing required fields
- Review browser console for generation errors

**Issue: Incorrect data in report**
- Verify allocationState and allocationOutputs are current
- Check investor name spelling for individual reports
- Ensure calculations are complete before export

## Future Enhancements

1. **Chart Embedding**: Convert charts to images and embed in PDFs
2. **Email Delivery**: Send reports via email using Resend/SendGrid
3. **Scheduled Reports**: Automated daily/weekly/monthly report generation
4. **Custom Branding**: Allow logo upload and custom color schemes
5. **Report Templates**: User-selectable report styles
6. **Multi-Language**: Support for international languages
7. **Interactive PDFs**: Form fields for notes/signatures
8. **Batch Export**: Export multiple reports at once
9. **Report History**: Track generated reports and re-download

## Support

For issues or questions:
1. Check this README
2. Review API documentation at `/api/reports/export-pdf`
3. Check browser console for errors
4. Contact development team

---

**Last Updated**: 2025-11-12
**Version**: 1.0.0
**Author**: MOD SQUAD AGENT #6 - PDF Export Engineer
