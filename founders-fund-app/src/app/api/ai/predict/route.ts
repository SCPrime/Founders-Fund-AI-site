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

interface PredictRequest {
  current_settings: {
    walletSize: number;
    realizedProfit: number;
    moonbagReal: number;
    moonbagUnreal: number;
    mgmtFeePct: number;
    entryFeePct: number;
    founderCount: number;
    includeUnreal: string;
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

    const body: PredictRequest = await req.json();
    const { current_settings } = body;

    const systemPrompt = `You are a predictive analytics AI for investment fund performance. Generate realistic ROI projections and risk assessments based on current fund metrics.

Current Fund Metrics:
- Total Wallet Size: $${current_settings.walletSize?.toLocaleString() || '0'}
- Realized Profit: $${current_settings.realizedProfit?.toLocaleString() || '0'}
- Moonbag (Real): $${current_settings.moonbagReal?.toLocaleString() || '0'}
- Moonbag (Unrealized): $${current_settings.moonbagUnreal?.toLocaleString() || '0'}
- Management Fee: ${current_settings.mgmtFeePct || 0}%
- Entry Fee: ${current_settings.entryFeePct || 0}%
- Founder Count: ${current_settings.founderCount || 1}
- Include Unrealized: ${current_settings.includeUnreal || 'no'}

Generate a JSON response with this exact structure:
{
  "roi_projection": {
    "conservative": number (decimal, e.g., 0.15 for 15%),
    "moderate": number (decimal, e.g., 0.25 for 25%),
    "aggressive": number (decimal, e.g., 0.45 for 45%),
    "timeframe_months": 12
  },
  "risk_assessment": {
    "overall_risk": "low" | "medium" | "high",
    "factors": ["string array of risk factors"],
    "recommendations": ["string array of recommendations"]
  },
  "optimization_suggestions": {
    "fee_structure": ["string array of fee optimization suggestions"],
    "allocation_strategy": ["string array of allocation suggestions"],
    "timing_recommendations": ["string array of timing suggestions"]
  }
}

Base your predictions on:
1. Current profit margins and fund size ratios
2. Fee structure efficiency
3. Market conditions and typical fund performance
4. Risk factors like concentration, fees, and unrealized assets
5. Industry benchmarks for similar fund sizes

Return ONLY the JSON object, no additional text.`;

    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate investment prediction based on the provided fund metrics.' }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No prediction generated');
    }

    try {
      const prediction = JSON.parse(response);

      // Validate the structure
      if (!prediction.roi_projection || !prediction.risk_assessment || !prediction.optimization_suggestions) {
        throw new Error('Invalid prediction structure');
      }

      return NextResponse.json({ prediction });
    } catch (parseError) {
      console.error('Failed to parse prediction JSON:', parseError);

      // Fallback prediction if JSON parsing fails
      const fallbackPrediction = {
        roi_projection: {
          conservative: Math.max(0.05, (current_settings.realizedProfit / Math.max(current_settings.walletSize, 1)) * 0.8),
          moderate: Math.max(0.12, (current_settings.realizedProfit / Math.max(current_settings.walletSize, 1)) * 1.2),
          aggressive: Math.max(0.25, (current_settings.realizedProfit / Math.max(current_settings.walletSize, 1)) * 2.0),
          timeframe_months: 12
        },
        risk_assessment: {
          overall_risk: current_settings.mgmtFeePct > 25 ? 'high' : current_settings.mgmtFeePct > 15 ? 'medium' : 'low',
          factors: [
            current_settings.mgmtFeePct > 20 ? 'High management fees may impact returns' : null,
            current_settings.walletSize < 10000 ? 'Small fund size increases volatility' : null,
            current_settings.moonbagUnreal > current_settings.moonbagReal * 2 ? 'High unrealized asset exposure' : null
          ].filter(Boolean),
          recommendations: [
            'Monitor fee structure impact on investor returns',
            'Consider diversification strategies',
            'Regular performance review recommended'
          ]
        },
        optimization_suggestions: {
          fee_structure: current_settings.mgmtFeePct > 20 ? ['Consider reducing management fee to improve competitiveness'] : ['Fee structure appears reasonable'],
          allocation_strategy: ['Maintain balanced portfolio allocation', 'Consider market timing for major positions'],
          timing_recommendations: ['Monitor market conditions for exit opportunities', 'Plan quarterly rebalancing']
        }
      };

      return NextResponse.json({ prediction: fallbackPrediction });
    }

  } catch (error) {
    console.error('Prediction API error:', error);
    return NextResponse.json(
      {
        error: 'Prediction generation failed',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}