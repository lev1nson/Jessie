import { NextRequest, NextResponse } from 'next/server';
import { sendTestAlert } from '@/lib/monitoring/alerting';

export async function POST(request: NextRequest) {
  try {
    // Simple auth check - in production, this should be properly secured
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'development'}`;
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Sending test alert...');
    
    const success = await sendTestAlert();
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test alert sent successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send test alert - check configuration',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Test alert API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to send test alert',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}