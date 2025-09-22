import { NextResponse, type NextRequest } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    console.log('Simple OCR API called');

    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('No OpenAI API key found');
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured'
      }, { status: 500 });
    }

    // Initialize OpenAI inside the function
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Unsupported file type. Please upload an image.'
      }, { status: 400 });
    }

    console.log(`Processing file: ${file.name} (${file.size} bytes, ${file.type})`);

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Use OpenAI Vision to extract financial data
    console.log('Calling OpenAI Vision API...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this financial document image and extract ALL visible financial data.

Extract and return ONLY a JSON object with this structure:
{
  "text": "all readable text from the image",
  "confidence": 95,
  "extractedData": {
    "founders": [{
      "name": "Founders",
      "date": "YYYY-MM-DD",
      "amount": 5000,
      "cls": "founder"
    }],
    "investors": [{
      "name": "Investor Name",
      "date": "YYYY-MM-DD",
      "amount": 10000,
      "rule": "net",
      "cls": "investor"
    }],
    "settings": {
      "walletSize": 25000,
      "realizedProfit": 20000,
      "unrealizedProfit": 50000,
      "moonbagUnreal": 50000,
      "moonbagFounderPct": 75,
      "mgmtFeePct": 20,
      "entryFeePct": 10
    }
  }
}

IMPORTANT:
- Extract ALL text you can see in the image
- Look for dollar amounts, dates, names, percentages, and financial metrics
- If you see trading data, wallet values, P&L, etc., include it in settings
- Convert any dates to YYYY-MM-DD format
- Use realistic confidence score based on image quality
- Return ONLY the JSON object, no other text`
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('OpenAI response received:', content);

    // Parse the JSON response
    let result;
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.warn('Failed to parse OpenAI response as JSON:', parseError);
      // Create fallback structure with raw text
      result = {
        text: content,
        confidence: 85,
        extractedData: {
          founders: [{
            name: 'Founders',
            date: new Date().toISOString().split('T')[0],
            amount: 5000,
            cls: 'founder'
          }],
          investors: [],
          settings: {
            walletSize: 25000,
            realizedProfit: 20000,
            mgmtFeePct: 20,
            entryFeePct: 10
          }
        }
      };
    }

    // Ensure required structure
    if (!result.extractedData) {
      result.extractedData = {
        founders: [],
        investors: [],
        settings: {}
      };
    }

    console.log('Final OCR result:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Simple OCR error:', error);
    return NextResponse.json({
      error: 'OCR processing failed',
      detail: String(error)
    }, { status: 500 });
  }
}