import { NextResponse } from 'next/server';
import { monitorSystemHealth } from '@/lib/monitoring/alerting';

async function fetchHealthCheck(endpoint: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/health/${endpoint}`, {
      headers: {
        'User-Agent': 'Health-Check-Internal'
      }
    });
    return await response.json();
  } catch (error) {
    return {
      healthy: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Run all health checks in parallel
    const checks = await Promise.allSettled([
      fetchHealthCheck('database'),
      fetchHealthCheck('gmail'),
      fetchHealthCheck('openai'),
      fetchHealthCheck('cron')
    ]);

    // Format results
    const formatCheck = (result: PromiseSettledResult<any>, name: string) => {
      if (result.status === 'fulfilled') {
        return {
          name,
          ...result.value
        };
      } else {
        return {
          name,
          healthy: false,
          status: 'error',
          error: result.reason?.message || 'Health check failed',
          timestamp: new Date().toISOString()
        };
      }
    };

    const healthChecks = {
      database: formatCheck(checks[0], 'database'),
      gmail: formatCheck(checks[1], 'gmail'),
      openai: formatCheck(checks[2], 'openai'),
      cron: formatCheck(checks[3], 'cron')
    };

    // Determine overall system health
    const allHealthy = Object.values(healthChecks).every(check => check.healthy);
    const overallStatus = allHealthy ? 'healthy' : 'unhealthy';

    const responseTime = Date.now() - startTime;

    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime,
      checks: healthChecks,
      summary: {
        total: Object.keys(healthChecks).length,
        healthy: Object.values(healthChecks).filter(check => check.healthy).length,
        unhealthy: Object.values(healthChecks).filter(check => !check.healthy).length
      }
    };

    // Monitor system health and trigger alerts if needed
    // Run this asynchronously to not delay the health check response
    monitorSystemHealth(healthData).catch(error => {
      console.error('Error in system health monitoring:', error);
    });

    return NextResponse.json(healthData);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Master health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Master health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        responseTime
      },
      { status: 500 }
    );
  }
}