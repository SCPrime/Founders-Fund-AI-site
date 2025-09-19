import { NextResponse, type NextRequest } from 'next/server';
import OpenAI from 'openai';

let openai: OpenAI | null = null;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

interface AnomalyRequest {
  current_settings: {
    walletSize: number;
    realizedProfit: number;
    moonbagReal: number;
    moonbagUnreal: number;
    mgmtFeePct: number;
    entryFeePct: number;
    founderCount: number;
  };
}

export async function POST(req: NextRequest) {
  try {
    const openaiClient = getOpenAI();
    if (!openaiClient) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const body: AnomalyRequest = await req.json();
    const { current_settings } = body;

    // Calculate some basic metrics for anomaly detection
    const totalAssets = current_settings.walletSize + current_settings.moonbagReal + current_settings.moonbagUnreal;
    const profitMargin = totalAssets > 0 ? (current_settings.realizedProfit / totalAssets) : 0;
    const unrealizedRatio = current_settings.moonbagReal > 0 ? (current_settings.moonbagUnreal / current_settings.moonbagReal) : 0;
    const totalFeeRate = current_settings.mgmtFeePct + current_settings.entryFeePct;

    const systemPrompt = `You are an anomaly detection AI for investment fund analysis. Identify unusual patterns, potential issues, and provide recommendations based on fund metrics.

Current Fund Analysis:
- Total Assets: $${totalAssets.toLocaleString()}
- Wallet Size: $${current_settings.walletSize?.toLocaleString() || '0'}
- Realized Profit: $${current_settings.realizedProfit?.toLocaleString() || '0'}
- Moonbag (Real): $${current_settings.moonbagReal?.toLocaleString() || '0'}
- Moonbag (Unrealized): $${current_settings.moonbagUnreal?.toLocaleString() || '0'}
- Management Fee: ${current_settings.mgmtFeePct || 0}%
- Entry Fee: ${current_settings.entryFeePct || 0}%
- Total Fee Rate: ${totalFeeRate}%
- Founder Count: ${current_settings.founderCount || 1}
- Profit Margin: ${(profitMargin * 100).toFixed(2)}%
- Unrealized/Realized Ratio: ${unrealizedRatio.toFixed(2)}

Industry Benchmarks for Reference:
- Typical management fees: 15-25%
- Typical entry fees: 5-15%
- Healthy profit margins: 10-30%
- Reasonable unrealized exposure: < 3x realized assets
- Minimum viable fund size: $50,000+

Detect anomalies and return JSON with this structure:
{
  "risk_level": "low" | "medium" | "high",
  "anomalies": ["string array of detected anomalies"],
  "recommendations": ["string array of actionable recommendations"],
  "fee_suggestions": ["string array of fee-related suggestions"],
  "allocation_suggestions": ["string array of allocation-related suggestions"],
  "timing_suggestions": ["string array of timing-related suggestions"]
}

Focus on detecting:
1. Unusually high or low fee structures
2. Imbalanced asset allocations
3. Excessive unrealized exposure
4. Insufficient fund capitalization
5. Poor profit margins
6. Unusual founder/investor ratios

Return ONLY the JSON object, no additional text.`;

    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Analyze the fund metrics for anomalies and provide recommendations.' }
      ],
      max_tokens: 800,
      temperature: 0.2,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No anomaly analysis generated');
    }

    try {
      const analysis = JSON.parse(response);

      // Validate the structure
      if (!analysis.risk_level || !analysis.anomalies || !analysis.recommendations) {
        throw new Error('Invalid analysis structure');
      }

      return NextResponse.json(analysis);
    } catch (parseError) {
      console.error('Failed to parse anomaly JSON:', parseError);

      // Fallback anomaly detection using rule-based logic
      const anomalies = [];
      const recommendations = [];
      const feeSuggestions = [];
      const allocationSuggestions = [];
      const timingSuggestions = [];

      // Rule-based anomaly detection
      if (totalFeeRate > 35) {
        anomalies.push('Extremely high total fee structure (>35%)');
        feeSuggestions.push('Consider reducing total fees to improve investor appeal');
      } else if (totalFeeRate > 25) {
        anomalies.push('High total fee structure (>25%)');
        feeSuggestions.push('Review fee competitiveness against industry standards');
      }

      if (current_settings.walletSize < 10000) {
        anomalies.push('Very small fund size may increase operational costs per dollar');
        allocationSuggestions.push('Consider fund consolidation or minimum investment thresholds');
      }

      if (unrealizedRatio > 5) {
        anomalies.push('Excessive unrealized asset exposure (>5x realized)');
        allocationSuggestions.push('Consider rebalancing to reduce unrealized exposure');
        timingSuggestions.push('Plan exit strategy for unrealized positions');
      }

      if (profitMargin < 0.05 && totalAssets > 0) {
        anomalies.push('Low profit margin (<5%) may indicate performance issues');
        recommendations.push('Review investment strategy and cost structure');
      }

      if (current_settings.founderCount > 5) {
        anomalies.push('High founder count may complicate decision-making');
        recommendations.push('Consider governance structure optimization');
      }

      // Default suggestions if no anomalies found
      if (anomalies.length === 0) {
        recommendations.push('Fund metrics appear healthy overall');
        recommendations.push('Continue monitoring performance regularly');
      }

      const fallbackAnalysis = {
        risk_level: anomalies.length > 3 ? 'high' : anomalies.length > 1 ? 'medium' : 'low',
        anomalies,
        recommendations: recommendations.length > 0 ? recommendations : ['Regular monitoring recommended'],
        fee_suggestions: feeSuggestions.length > 0 ? feeSuggestions : ['Fee structure appears reasonable'],
        allocation_suggestions: allocationSuggestions.length > 0 ? allocationSuggestions : ['Allocation appears balanced'],
        timing_suggestions: timingSuggestions.length > 0 ? timingSuggestions : ['No immediate timing concerns identified']
      };

      return NextResponse.json(fallbackAnalysis);
    }

  } catch (error) {
    console.error('Anomaly detection API error:', error);
    return NextResponse.json(
      {
        error: 'Anomaly detection failed',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}