import { NextResponse } from 'next/server';

// Test the debug system with a simulated trading dashboard scenario
export async function GET() {
  // Simulate what the debug OCR would extract from your trading dashboard
  const simulatedDebugResult = {
    success: true,
    rawText: `Trading Dashboard
Total Value $26,005
Unrealized PNL +$52.3
Available Balance $25,952.7
Realized PNL +$6.02K
30d PNL +$6,020
Total Transactions 3,103
2,190W 913L
70% Win Rate
Aug 26, 2025`,
    extractedData: {
      totalValue: 26005,
      unrealizedPNL: 52.3,
      realizedPNL: 6020,
      availableBalance: 25952.7,
      totalTransactions: 3103,
      wins: 2190,
      losses: 913
    },
    extractionLog: [
      "totalValue: Found '$26,005' in top section labeled 'Total Value'",
      "unrealizedPNL: Found '+$52.3' next to 'Unrealized PNL' label",
      "realizedPNL: Found '+$6.02K' converted to 6020 from '30d PNL' section",
      "availableBalance: Found '$25,952.7' labeled as 'Available Balance'",
      "totalTransactions: Found '3,103' in transactions section",
      "wins: Found '2,190W' in win/loss display, extracted 2190",
      "losses: Found '913L' in win/loss display, extracted 913"
    ],
    confidence: 85,
    validation: {
      issues: [
        "✅ Math check passed: 26005 ≈ 25952.7 + 52.3 (difference: 0.0)",
        "✅ Win/Loss check passed: 2190 + 913 = 3103 ≈ 3103",
        "✅ Realistic total value: $26,005",
        "✅ Win rate: 70.6% (within normal range)"
      ],
      confidenceBonus: 35,
      fieldsFound: 7
    },
    finalConfidence: 92,
    debug: {
      parseError: false,
      originalResponse: '{"extracted":{"totalValue":26005,"unrealizedPNL":52.3...}}'
    }
  };

  // Calculate confidence breakdown
  const confidenceBreakdown = {
    baseConfidence: 50,
    fieldsBonus: 7 * 8, // 7 fields found × 8% each = 56%
    mathValidation: 15, // Total value matches balance + unrealized
    winLossValidation: 10, // Win/loss totals match transactions
    realisticValues: 5, // Values are in realistic ranges
    totalBeforeCap: 50 + 56 + 15 + 10 + 5, // 136%
    finalCapped: 92 // Capped at reasonable maximum
  };

  return NextResponse.json({
    message: "Debug OCR Test Results",
    expectedResults: simulatedDebugResult,
    confidenceBreakdown,
    interpretation: {
      "What this means": "The OCR successfully extracted all critical financial values",
      "High confidence factors": [
        "All 7 critical fields found",
        "Mathematical validation passed",
        "Win/loss counts match total transactions",
        "Values are realistic for trading account"
      ],
      "Potential issues": [
        "None detected in this simulation",
        "Real images may have OCR reading errors",
        "Poor image quality could reduce accuracy"
      ]
    },
    nextSteps: [
      "1. Upload your actual trading dashboard image",
      "2. Compare results with this simulation",
      "3. If confidence is low, check image quality",
      "4. Review extraction log to see what was missed"
    ]
  });
}

export async function POST() {
  return NextResponse.json({
    message: "Use GET to see simulated debug results, or upload an actual image to /api/debug-ocr"
  });
}