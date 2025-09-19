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

interface AnalyzeRequest {
  text: string;
  context: 'financial_document' | 'user_query' | 'prediction_analysis' | 'data_validation' | 'document_analysis';
  current_settings?: {
    walletSize: number;
    realizedProfit: number;
    mgmtFeePct: number;
    entryFeePct: number;
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

    const body: AnalyzeRequest = await req.json();
    const { text, context, current_settings } = body;

    let systemPrompt = '';
    let userPrompt = '';

    switch (context) {
      case 'financial_document':
        systemPrompt = `You are a financial analyst assistant for Founders Fund calculations. Extract and analyze financial data from documents, focusing on:
- Contribution dates and amounts
- Investment entries and exits
- Fee structures and percentages
- Risk assessments and predictions

Provide structured, actionable insights that can be used to populate calculation tables.`;
        userPrompt = `Analyze this financial document and extract relevant data:\n\n${text}`;
        break;

      case 'document_analysis':
        systemPrompt = `You are an AI assistant specializing in Founders Fund document analysis. Your job is to:
1. Extract contribution data (dates, amounts)
2. Identify investor information
3. Parse fee structures
4. Suggest data population for calculation tables
5. Flag any anomalies or missing information

Format your response with clear sections and actionable recommendations.`;
        userPrompt = `Please analyze this document and provide structured insights for populating fund calculation tables:\n\n${text}`;
        break;

      case 'user_query':
        systemPrompt = `You are an expert AI assistant for Founders Fund calculations. You help users with:
- Understanding fund allocation calculations
- Interpreting fee structures and profit distributions
- Providing investment insights and recommendations
- Explaining complex financial concepts in simple terms
- Suggesting optimizations for fund performance

Current fund settings:
- Wallet Size: $${current_settings?.walletSize?.toLocaleString() || 'Not set'}
- Realized Profit: $${current_settings?.realizedProfit?.toLocaleString() || 'Not set'}
- Management Fee: ${current_settings?.mgmtFeePct || 'Not set'}%
- Entry Fee: ${current_settings?.entryFeePct || 'Not set'}%

Be helpful, accurate, and provide actionable advice.`;
        userPrompt = text;
        break;

      case 'prediction_analysis':
        systemPrompt = `You are a predictive analytics AI for Founders Fund investments. Generate investment predictions based on current fund data:

Current Settings:
- Wallet Size: $${current_settings?.walletSize?.toLocaleString() || '0'}
- Realized Profit: $${current_settings?.realizedProfit?.toLocaleString() || '0'}
- Management Fee: ${current_settings?.mgmtFeePct || '0'}%
- Entry Fee: ${current_settings?.entryFeePct || '0'}%

Provide insights on:
1. Potential ROI projections
2. Risk assessment
3. Optimal allocation strategies
4. Market trend considerations
5. Fee impact analysis`;
        userPrompt = 'Generate a comprehensive investment prediction and analysis based on the current fund settings.';
        break;

      case 'data_validation':
        systemPrompt = `You are a data validation AI for Founders Fund calculations. Analyze the current fund settings and identify:
1. Potential inconsistencies or errors
2. Missing critical data points
3. Unusual patterns that need attention
4. Optimization opportunities
5. Compliance considerations

Current Settings:
- Wallet Size: $${current_settings?.walletSize?.toLocaleString() || '0'}
- Realized Profit: $${current_settings?.realizedProfit?.toLocaleString() || '0'}
- Management Fee: ${current_settings?.mgmtFeePct || '0'}%
- Entry Fee: ${current_settings?.entryFeePct || '0'}%

Provide specific, actionable validation results.`;
        userPrompt = 'Validate the current fund data and settings for accuracy and completeness.';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid context provided' },
          { status: 400 }
        );
    }

    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const analysis = completion.choices[0]?.message?.content || 'No analysis generated';

    // For document analysis, try to extract structured data
    let extractedData = null;
    if (context === 'document_analysis' && text) {
      try {
        const extractionCompletion = await openaiClient.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Extract structured data from financial documents. Return ONLY valid JSON with this exact structure:
{
  "founders": [{"date": "YYYY-MM-DD", "amount": number}],
  "investors": [{"date": "YYYY-MM-DD", "amount": number}],
  "settings": {
    "walletSize": number,
    "realizedProfit": number,
    "mgmtFeePct": number,
    "entryFeePct": number
  }
}

If no data is found for a section, use empty arrays or null values. Only include numeric amounts, dates in YYYY-MM-DD format.`
            },
            { role: 'user', content: text }
          ],
          max_tokens: 800,
          temperature: 0.1,
        });

        const extractedText = extractionCompletion.choices[0]?.message?.content;
        if (extractedText) {
          try {
            extractedData = JSON.parse(extractedText);
          } catch {
            // Invalid JSON, ignore extracted data
          }
        }
      } catch (error) {
        console.warn('Data extraction failed:', error);
      }
    }

    return NextResponse.json({
      analysis,
      extractedData,
      context,
    });

  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json(
      {
        error: 'AI analysis failed',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}