import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        healthy: false,
        status: 'error',
        error: 'OpenAI API key not configured',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        details: {
          apiKeyConfigured: false
        }
      }, { status: 500 });
    }
    
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    // Make a lightweight API call to verify connectivity
    const response = await openai.models.list();
    const responseTime = Date.now() - startTime;
    
    if (!response || !response.data) {
      return NextResponse.json({
        healthy: false,
        status: 'error',
        error: 'OpenAI API returned invalid response',
        responseTime,
        timestamp: new Date().toISOString(),
        details: {
          apiKeyConfigured: true,
          apiCallSuccessful: false
        }
      }, { status: 500 });
    }
    
    return NextResponse.json({
      healthy: true,
      status: 'ok',
      responseTime,
      timestamp: new Date().toISOString(),
      details: {
        apiKeyConfigured: true,
        apiCallSuccessful: true,
        modelsAvailable: response.data.length,
        availableModels: response.data
          .filter(model => model.id.includes('gpt'))
          .slice(0, 5)
          .map(model => model.id)
      }
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('OpenAI API health check failed:', error);
    
    // Check if it's an authentication error
    const isAuthError = error instanceof Error && 
      (error.message.includes('401') || error.message.includes('authentication'));
    
    return NextResponse.json({
      healthy: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      timestamp: new Date().toISOString(),
      details: {
        apiKeyConfigured: !!process.env.OPENAI_API_KEY,
        authenticationError: isAuthError,
        errorType: isAuthError ? 'authentication' : 'connection'
      }
    }, { status: 500 });
  }
}