import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Debug OCR route to show exactly what's being extracted
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Convert to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    console.log('=== DEBUG OCR PROCESSING ===');

    // STEP 1: Raw text extraction
    const rawResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract ALL visible text from this image. Return it exactly as you see it, line by line. Include numbers, labels, everything visible. Do not interpret or format - just transcribe what you see.`
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0
    });

    const rawText = rawResponse.choices[0]?.message?.content || '';
    console.log('Raw OCR Text:', rawText);

    // STEP 2: Structured extraction with ultra-precise instructions
    const structuredResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a financial data extraction specialist. Analyze this trading dashboard image with MAXIMUM precision.

CRITICAL INSTRUCTIONS:
1. Look for EXACT dollar amounts: $26,005, $52.3, $6,020, etc.
2. Look for trade counts: 2,190, 913, 3,103, etc.
3. Parse "K" notation: $6.02K = 6020
4. Handle +/- signs: +$52.3 = positive, -$1,200 = negative
5. Extract win/loss patterns: "2190W 913L" = wins:2190, losses:913

EXTRACT THESE SPECIFIC VALUES:
- totalValue: Account total/equity (look for largest dollar amount)
- unrealizedPNL: Floating P&L (often +/- small amount)
- realizedPNL: Closed P&L or 30d PNL (larger profit/loss)
- availableBalance: Free cash/margin
- totalTransactions: Total trades count
- wins: Winning trades count
- losses: Losing trades count

DEBUGGING: For each field you extract, explain WHERE you found it and what the original text looked like.

Return this EXACT format:
{
  "extracted": {
    "totalValue": number_or_null,
    "unrealizedPNL": number_or_null,
    "realizedPNL": number_or_null,
    "availableBalance": number_or_null,
    "totalTransactions": number_or_null,
    "wins": number_or_null,
    "losses": number_or_null
  },
  "extraction_log": [
    "totalValue: Found '$26,005' in top left corner",
    "wins: Found '2190W' in bottom right section",
    etc...
  ],
  "confidence": your_confidence_0_to_100
}`
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` }
            }
          ]
        }
      ],
      max_tokens: 800,
      temperature: 0
    });

    const structuredText = structuredResponse.choices[0]?.message?.content || '{}';
    console.log('Structured OCR Response:', structuredText);

    // Parse the structured response
    let extractedData;
    try {
      // Clean the JSON response
      const jsonStr = structuredText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      extractedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      extractedData = {
        extracted: {},
        extraction_log: ['Failed to parse structured response'],
        confidence: 0
      };
    }

    // STEP 3: Validation and final confidence
    const validation = validateExtractedData(extractedData.extracted || {});

    return NextResponse.json({
      success: true,
      rawText,
      extractedData: extractedData.extracted || {},
      extractionLog: extractedData.extraction_log || [],
      confidence: extractedData.confidence || 0,
      validation,
      finalConfidence: Math.max(0, (extractedData.confidence || 0) + validation.confidenceBonus),
      debug: {
        parseError: !extractedData.extracted,
        originalResponse: structuredText.substring(0, 500)
      }
    });

  } catch (error) {
    console.error('Debug OCR error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Debug OCR failed',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

function validateExtractedData(data: Record<string, unknown>) {
  const issues: string[] = [];
  let confidenceBonus = 0;

  // Check for required fields
  const requiredFields = ['totalValue', 'realizedPNL'];
  const foundRequired = requiredFields.filter(field => data[field] !== null && data[field] !== undefined);
  confidenceBonus += (foundRequired.length / requiredFields.length) * 20;

  // Mathematical validation
  if (data.totalValue && data.availableBalance && data.unrealizedPNL) {
    const totalValue = Number(data.totalValue);
    const availableBalance = Number(data.availableBalance);
    const unrealizedPNL = Number(data.unrealizedPNL);
    const expected = availableBalance + unrealizedPNL;
    const diff = Math.abs(totalValue - expected);
    const tolerance = totalValue * 0.15; // 15% tolerance

    if (diff <= tolerance) {
      confidenceBonus += 15;
      issues.push(`✅ Math check passed: ${totalValue} ≈ ${availableBalance} + ${unrealizedPNL}`);
    } else {
      issues.push(`❌ Math check failed: ${totalValue} ≠ ${availableBalance} + ${unrealizedPNL}`);
    }
  }

  // Win/Loss validation
  if (data.wins && data.losses && data.totalTransactions) {
    const wins = Number(data.wins);
    const losses = Number(data.losses);
    const totalTransactions = Number(data.totalTransactions);
    const calculated = wins + losses;
    const diff = Math.abs(calculated - totalTransactions);
    const tolerance = Math.max(totalTransactions * 0.1, 50);

    if (diff <= tolerance) {
      confidenceBonus += 10;
      issues.push(`✅ Win/Loss check passed: ${wins} + ${losses} ≈ ${totalTransactions}`);
    } else {
      issues.push(`❌ Win/Loss mismatch: ${wins} + ${losses} = ${calculated} ≠ ${totalTransactions}`);
    }
  }

  // Realistic value checks
  if (data.totalValue) {
    const totalValue = Number(data.totalValue);
    if (totalValue >= 1000 && totalValue <= 1000000) {
      confidenceBonus += 5;
      issues.push(`✅ Realistic total value: $${totalValue}`);
    } else {
      issues.push(`❓ Unusual total value: $${totalValue}`);
    }
  }

  return {
    issues,
    confidenceBonus: Math.min(40, confidenceBonus), // Max 40% bonus
    fieldsFound: Object.keys(data).filter(key => data[key] !== null && data[key] !== undefined).length
  };
}

export async function GET() {
  return NextResponse.json({
    message: 'Debug OCR API',
    endpoint: '/api/debug-ocr',
    purpose: 'Show exact OCR extraction process and values'
  });
}