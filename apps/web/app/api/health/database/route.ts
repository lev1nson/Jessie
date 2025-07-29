import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const supabase = createClient();
    
    // Test basic connectivity
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return NextResponse.json({
        healthy: false,
        status: 'error',
        error: error.message,
        responseTime,
        timestamp: new Date().toISOString(),
        details: 'Database connection failed'
      }, { status: 500 });
    }
    
    // Test write capability with a simple operation
    const { error: writeError } = await supabase
      .from('system_status')
      .upsert({
        component: 'database',
        status: 'healthy',
        details: { responseTime, testType: 'health_check' },
        timestamp: new Date().toISOString()
      });
    
    return NextResponse.json({
      healthy: true,
      status: 'ok',
      responseTime,
      timestamp: new Date().toISOString(),
      details: {
        connected: true,
        readTest: 'passed',
        writeTest: writeError ? 'failed' : 'passed',
        writeError: writeError?.message || null
      }
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Database health check failed:', error);
    
    return NextResponse.json({
      healthy: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      timestamp: new Date().toISOString(),
      details: 'Database health check exception'
    }, { status: 500 });
  }
}