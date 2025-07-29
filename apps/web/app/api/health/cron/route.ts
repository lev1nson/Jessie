import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const supabase = createClient();
    
    // Check if cron secret is configured
    const cronSecretConfigured = !!process.env.CRON_SECRET;
    
    if (!cronSecretConfigured) {
      return NextResponse.json({
        healthy: false,
        status: 'error',
        error: 'CRON_SECRET not configured',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        details: {
          cronSecretConfigured: false
        }
      }, { status: 500 });
    }
    
    // Get the last system status entry for cron component
    const { data: lastStatus, error: statusError } = await supabase
      .from('system_status')
      .select('*')
      .eq('component', 'email_sync_cron')
      .order('timestamp', { ascending: false })
      .limit(1);
    
    // Check for recent cron activity in the last 4 hours (14400000 ms)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    
    let lastExecution = null;
    let timeSinceLastRun = null;
    let isHealthy = true;
    let lastStatus_status = 'unknown';
    
    if (lastStatus && lastStatus.length > 0) {
      const lastRecord = lastStatus[0];
      lastExecution = new Date(lastRecord.timestamp);
      timeSinceLastRun = Date.now() - lastExecution.getTime();
      isHealthy = timeSinceLastRun < 4 * 60 * 60 * 1000; // 4 hours
      lastStatus_status = lastRecord.status;
    } else {
      // No records found, consider unhealthy
      isHealthy = false;
      lastStatus_status = 'no_data';
    }
    
    // Calculate next scheduled run (assuming hourly)
    const nextScheduled = new Date();
    nextScheduled.setHours(nextScheduled.getHours() + 1, 0, 0, 0);
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      healthy: isHealthy,
      status: isHealthy ? 'ok' : 'warning',
      responseTime,
      timestamp: new Date().toISOString(),
      details: {
        cronSecretConfigured: true,
        lastExecution: lastExecution?.toISOString() || null,
        timeSinceLastRunMs: timeSinceLastRun,
        timeSinceLastRunHours: timeSinceLastRun ? (timeSinceLastRun / (60 * 60 * 1000)).toFixed(2) : null,
        lastStatus: lastStatus_status,
        nextScheduled: nextScheduled.toISOString(),
        healthyThreshold: '4 hours',
        note: isHealthy ? 'Cron job running within expected schedule' : 'Cron job may be stalled or not running'
      }
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Cron health check failed:', error);
    
    return NextResponse.json({
      healthy: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      timestamp: new Date().toISOString(),
      details: 'Cron health check exception'
    }, { status: 500 });
  }
}