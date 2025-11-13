import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

interface TradingStrategy {
  name: string;
  description: string;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  entryRules: string[];
  exitRules: string[];
  positionSizing: {
    maxPositionSize: number;
    initialPositionPercent: number;
    scaleInStrategy: string;
  };
  riskManagement: {
    stopLossPercent: number;
    takeProfitPercent: number;
    maxDrawdownPercent: number;
    dailyLossLimit: number;
  };
  indicators: string[];
  timeframes: string[];
  tradingHours: string;
  notes: string;
}

// POST /api/agents/create-strategy - Generate AI trading strategy
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, symbol, allocation, riskTolerance } = body;

    if (!prompt || !symbol) {
      return NextResponse.json(
        { error: 'prompt and symbol are required' },
        { status: 400 }
      );
    }

    // Build system prompt for strategy generation
    const systemPrompt = `You are an expert cryptocurrency trading strategist specializing in meme coin trading.
Generate a comprehensive, actionable trading strategy based on user requirements.

IMPORTANT: Return your response as a valid JSON object matching this TypeScript interface:
{
  name: string;
  description: string;
  riskProfile: "conservative" | "moderate" | "aggressive";
  entryRules: string[];
  exitRules: string[];
  positionSizing: {
    maxPositionSize: number;
    initialPositionPercent: number;
    scaleInStrategy: string;
  };
  riskManagement: {
    stopLossPercent: number;
    takeProfitPercent: number;
    maxDrawdownPercent: number;
    dailyLossLimit: number;
  };
  indicators: string[];
  timeframes: string[];
  tradingHours: string;
  notes: string;
}

Consider:
- Market volatility and liquidity
- Risk management principles
- Position sizing based on capital allocation
- Entry and exit criteria
- Technical indicators and signals
- Stop-loss and take-profit levels
- Maximum drawdown limits

Generate realistic, practical strategies that can be automated.`;

    const userPrompt = `Generate a trading strategy for ${symbol} with the following requirements:

User Request: ${prompt}

Additional Parameters:
- Capital Allocation: $${allocation || 'Not specified'}
- Risk Tolerance: ${riskTolerance || 'Moderate'}
- Asset Type: Meme Coin / High Volatility Crypto

Please provide a detailed, actionable trading strategy in JSON format.`;

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    // Extract strategy from response
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from Claude');
    }

    // Parse JSON from response
    let strategy: TradingStrategy;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : content.text;
      strategy = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse strategy JSON:', parseError);
      throw new Error('Failed to parse strategy from AI response');
    }

    // Validate strategy structure
    if (!strategy.name || !strategy.entryRules || !strategy.exitRules) {
      throw new Error('Invalid strategy structure returned from AI');
    }

    return NextResponse.json({
      strategy,
      rawResponse: content.text,
      model: message.model,
      usage: message.usage
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Strategy generation failed:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate strategy' },
      { status: 500 }
    );
  }
}

// GET /api/agents/create-strategy - Get strategy templates
export async function GET() {
  const templates = [
    {
      id: 'momentum-scalper',
      name: 'Momentum Scalper',
      description: 'Quick in-and-out trades based on momentum indicators',
      riskProfile: 'aggressive',
      suitableFor: ['PEPE', 'SHIB', 'DOGE', 'FLOKI']
    },
    {
      id: 'trend-follower',
      name: 'Trend Follower',
      description: 'Ride medium-term trends with trailing stops',
      riskProfile: 'moderate',
      suitableFor: ['All meme coins']
    },
    {
      id: 'mean-reversion',
      name: 'Mean Reversion',
      description: 'Buy dips and sell pumps based on statistical analysis',
      riskProfile: 'moderate',
      suitableFor: ['Established meme coins with history']
    },
    {
      id: 'breakout-trader',
      name: 'Breakout Trader',
      description: 'Enter on confirmed breakouts with volume confirmation',
      riskProfile: 'aggressive',
      suitableFor: ['High volume meme coins']
    },
    {
      id: 'conservative-accumulator',
      name: 'Conservative Accumulator',
      description: 'Dollar-cost averaging with strict risk limits',
      riskProfile: 'conservative',
      suitableFor: ['Top 10 meme coins by market cap']
    }
  ];

  return NextResponse.json({ templates });
}
