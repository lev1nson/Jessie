import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check if Gmail API credentials are configured
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return NextResponse.json({
        healthy: false,
        status: 'error',
        error: 'Gmail API credentials not configured',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        details: {
          clientIdConfigured: !!clientId,
          clientSecretConfigured: !!clientSecret
        }
      }, { status: 500 });
    }
    
    // Test OAuth2 client initialization
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      process.env.NEXTAUTH_URL + '/api/auth/google/callback'
    );
    
    // For health check, we can only verify configuration
    // Real API calls require user tokens which we don't have in health check
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      healthy: true,
      status: 'ok',
      responseTime,
      timestamp: new Date().toISOString(),
      details: {
        credentialsConfigured: true,
        oauth2ClientInitialized: true,
        note: 'API calls require user authentication - only configuration verified'
      }
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Gmail API health check failed:', error);
    
    return NextResponse.json({
      healthy: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      timestamp: new Date().toISOString(),
      details: 'Gmail API configuration test failed'
    }, { status: 500 });
  }
}