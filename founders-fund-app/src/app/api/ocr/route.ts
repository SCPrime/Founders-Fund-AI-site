import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

// Ensure Node.js runtime for better performance with heavy operations
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file uploaded.' },
        { status: 400 }
      );
    }

    logger.api('POST', '/api/ocr', { filename: file.name, size: file.size });

    // Convert File to Buffer for processing
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Dynamic import of heavy dependencies to improve cold start performance
    logger.debug('Starting OCR text recognition');
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');

    try {
      const { data: { text: ocrText } } = await worker.recognize(buffer);
      logger.ocrResult(ocrText);

      // Use OpenAI to extract the numbers from the OCR text
      logger.debug('Processing OCR text with AI for financial data extraction');

      // Dynamic import OpenAI to reduce cold start time
      const OpenAI = await import('openai');
      const openai = new OpenAI.default({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const prompt = `The following text is from a financial account statement or trading dashboard. Extract the current total portfolio value and the unrealized P/L (profit/loss).

Reply in JSON format with "wallet" and "unrealized" fields. Use numbers only (no currency symbols).

Examples:
- If you see "Total Value: $12,345.67" and "Unrealized P/L: -$89.10", reply: {"wallet": 12345.67, "unrealized": -89.10}
- If you see "Portfolio Balance: 25000" and "Unrealized: +500", reply: {"wallet": 25000, "unrealized": 500}

Text to analyze:
"""${ocrText}"""`;

      const aiResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a financial data extraction assistant. Extract portfolio values and unrealized P/L from account statements.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0
      });

      const aiText = aiResponse.choices[0]?.message?.content?.trim();
      logger.aiResponse(aiText);

      // Parse OpenAI response
      let walletSize = 0;
      let unrealized = 0;

      try {
        if (aiText && aiText.startsWith('{')) {
          const parsed = JSON.parse(aiText);
          walletSize = parseFloat(parsed.wallet) || 0;
          unrealized = parseFloat(parsed.unrealized) || 0;
        } else {
          // Fallback: extract numbers from aiText if not JSON
          logger.debug('Fallback: extracting numbers from non-JSON response');
          const nums = aiText?.match(/-?[\d,.]+/g);
          if (nums && nums.length >= 1) {
            walletSize = parseFloat(nums[0].replace(/,/g, '')) || 0;
            if (nums.length >= 2) {
              unrealized = parseFloat(nums[1].replace(/,/g, '')) || 0;
            }
          }
        }
      } catch (parseError) {
        logger.error('Failed to parse AI response', parseError);
        // Last resort: try to find any numbers in the text
        const nums = aiText?.match(/-?[\d,.]+/g);
        if (nums && nums.length >= 1) {
          walletSize = parseFloat(nums[0].replace(/,/g, '')) || 0;
          if (nums.length >= 2) {
            unrealized = parseFloat(nums[1].replace(/,/g, '')) || 0;
          }
        }
      }

      logger.info('Financial data extracted successfully', { walletSize, unrealized });

      const response = NextResponse.json({
        walletSize,
        unrealized,
        ocrText: ocrText.substring(0, 500), // Include first 500 chars for debugging
        aiResponse: aiText
      });

      // Prevent caching of sensitive OCR data
      response.headers.set('Cache-Control', 'no-store, max-age=0');
      return response;

    } finally {
      await worker.terminate();
    }

  } catch (error) {
    logger.error('OCR processing failed', error);
    return NextResponse.json(
      {
        error: 'OCR processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to upload images.' },
    { status: 405 }
  );
}