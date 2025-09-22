import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
  try {
    console.log('Testing Claude API connection...');

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'ANTHROPIC_API_KEY not configured'
      });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 50,
      messages: [{
        role: "user",
        content: "Hello! Please respond with 'API connection successful' to test the connection."
      }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return NextResponse.json({
        success: true,
        message: "Claude API connection successful",
        response: content.text
      });
    }

    return NextResponse.json({
      success: false,
      error: "Unexpected response format"
    });

  } catch (error) {
    console.error('Claude API test error:', error);
    return NextResponse.json({
      success: false,
      error: `API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}