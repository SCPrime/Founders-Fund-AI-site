import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface PNLData {
  realizedPNL?: number;
  unrealizedPNL?: number;
  totalBalance?: number;
  totalWalletSize?: number;
  totalTransactions?: number;
  totalTrades?: number;
  wins?: number;
  losses?: number;
  winRate?: number;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // Send to OpenAI GPT-4 Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are analyzing a trading dashboard screenshot. Based on typical trading UI layouts, extract the following financial data:

DASHBOARD LAYOUT ANALYSIS:
- LEFT SIDE typically shows: Total Value/Equity, Unrealized PNL, Available Balance
- RIGHT SIDE typically shows: Realized PNL, Total Transactions, Win/Loss counts
- TOP AREA may show: Account summary, current balances
- BOTTOM AREA may show: Performance metrics, trade history

EXTRACT THESE EXACT FIELDS:
{
  "totalValue": number,           // Account equity/total value ($26,005 format)
  "unrealizedPNL": number,        // Floating P&L (+$52.3 format, can be negative)
  "realizedPNL": number,          // Closed P&L or 30d PNL (+$6,020 format)
  "availableBalance": number,     // Free cash/margin ($25,952.7 format)
  "totalTransactions": number,    // Total trades count (3,103 format)
  "wins": number,                 // Winning trades (2,190 format)
  "losses": number,               // Losing trades (913 format)
  "timestamp": string             // Any date/time visible
}

EXTRACTION RULES:
1. Look for dollar amounts with $ symbol or currency formatting
2. For win/loss, look for patterns like "2,190W 913L" or "2190 wins / 913 losses"
3. Ignore percentage values (70% win rate, etc.)
4. Ignore graph/chart visualizations
5. Return null for fields not found
6. Parse numbers correctly: "26,005" becomes 26005

Return ONLY the JSON object, no explanatory text.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`
              }
            }
          ]
        }
      ],
      max_tokens: 300,
      temperature: 0.1
    });

    // Parse the response
    const content = response.choices[0]?.message?.content || '{}';

    // Try to extract JSON from the response
    let pnlData: PNLData;
    try {
      // Remove any markdown formatting if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      pnlData = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse OpenAI response:', content);

      // Try to extract values using regex as fallback
      pnlData = extractPNLWithRegex(content);
    }

    // Calculate win rate if we have wins and losses
    if (pnlData.wins !== undefined && pnlData.losses !== undefined) {
      const totalTrades = pnlData.wins + pnlData.losses;
      if (totalTrades > 0) {
        pnlData.winRate = Math.round((pnlData.wins / totalTrades) * 100);
        pnlData.totalTrades = totalTrades;
      }
    }

    // Enhanced confidence calculation
    let confidence = 50; // Base confidence
    let fieldsFound = 0;

    // Count non-null fields and boost confidence
    const criticalFields = ['totalValue', 'realizedPNL', 'unrealizedPNL', 'wins', 'losses'];
    criticalFields.forEach(field => {
      if (pnlData[field as keyof PNLData] !== undefined && pnlData[field as keyof PNLData] !== null) {
        fieldsFound++;
        confidence += 8; // 8% per critical field
      }
    });

    // Mathematical validation bonus
    if (pnlData.totalValue && pnlData.availableBalance && pnlData.unrealizedPNL) {
      const expected = pnlData.availableBalance + pnlData.unrealizedPNL;
      const diff = Math.abs(pnlData.totalValue - expected);
      const tolerance = pnlData.totalValue * 0.15;

      if (diff <= tolerance) {
        confidence += 15; // Math validation bonus
      }
    }

    // Win/Loss validation bonus
    if (pnlData.wins && pnlData.losses && pnlData.totalTransactions) {
      const calculatedTotal = pnlData.wins + pnlData.losses;
      const diff = Math.abs(calculatedTotal - pnlData.totalTransactions);
      if (diff <= Math.max(pnlData.totalTransactions * 0.1, 50)) {
        confidence += 10; // Win/Loss validation bonus
      }
    }

    // Realistic value bonus
    if (pnlData.totalValue && pnlData.totalValue >= 1000 && pnlData.totalValue <= 1000000) {
      confidence += 5;
    }

    const finalConfidence = Math.min(98, Math.max(45, confidence));

    return NextResponse.json({
      success: true,
      data: {
        ...pnlData,
        confidence: finalConfidence,
        fieldsExtracted: fieldsFound,
        extractionQuality: fieldsFound >= 5 ? 'high' : fieldsFound >= 3 ? 'medium' : 'low'
      },
      message: `PNL data extracted successfully (${fieldsFound}/5 critical fields found)`,
      debug: {
        baseConfidence: 50,
        fieldBonus: (fieldsFound * 8),
        finalConfidence,
        criticalFieldsFound: fieldsFound
      }
    });

  } catch (error) {
    console.error('PNL extraction error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract PNL data',
        data: null
      },
      { status: 500 }
    );
  }
}

// Fallback regex extraction
function extractPNLWithRegex(text: string): PNLData {
  const data: PNLData = {};

  // Extract realized PNL
  const realizedMatch = text.match(/realized\s*pnl[:\s]*\$?([\d,]+(?:\.\d+)?)/i);
  if (realizedMatch) {
    data.realizedPNL = parseFloat(realizedMatch[1].replace(/,/g, ''));
  }

  // Extract unrealized PNL
  const unrealizedMatch = text.match(/unrealized\s*pnl[:\s]*\$?([\d,]+(?:\.\d+)?)/i);
  if (unrealizedMatch) {
    data.unrealizedPNL = parseFloat(unrealizedMatch[1].replace(/,/g, ''));
  }

  // Extract total balance
  const balanceMatch = text.match(/total\s*balance[:\s]*\$?([\d,]+(?:\.\d+)?)/i);
  if (balanceMatch) {
    data.totalBalance = parseFloat(balanceMatch[1].replace(/,/g, ''));
  }

  // Extract wallet size
  const walletMatch = text.match(/(?:total\s*wallet\s*size|total\s*value)[:\s]*\$?([\d,]+(?:\.\d+)?)/i);
  if (walletMatch) {
    data.totalWalletSize = parseFloat(walletMatch[1].replace(/,/g, ''));
  }

  // Extract transactions
  const txnsMatch = text.match(/(?:total\s*transactions|txns)[:\s]*(\d+)/i);
  if (txnsMatch) {
    data.totalTransactions = parseInt(txnsMatch[1]);
  }

  // Extract wins/losses
  const winsLossesMatch = text.match(/(\d+)\s*w\s*(\d+)\s*l/i);
  if (winsLossesMatch) {
    data.wins = parseInt(winsLossesMatch[1]);
    data.losses = parseInt(winsLossesMatch[2]);
  }

  // Extract timestamp
  const timestampMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  if (timestampMatch) {
    data.timestamp = timestampMatch[1];
  }

  return data;
}

// GET method for testing the endpoint
export async function GET() {
  return NextResponse.json({
    message: 'PNL Extract API',
    endpoint: '/api/pnl-extract',
    method: 'POST',
    accepts: 'multipart/form-data with "image" field',
    returns: 'JSON with PNL data',
    fields: [
      'realizedPNL',
      'unrealizedPNL',
      'totalBalance',
      'totalWalletSize',
      'totalTransactions',
      'totalTrades',
      'wins',
      'losses',
      'winRate',
      'timestamp'
    ]
  });
}