import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from '@/lib/monitoring/metrics';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric');
    const timeRange = (searchParams.get('range') || '24h') as '1h' | '24h' | '7d' | '30d';
    
    if (!metric) {
      return NextResponse.json({
        error: 'Metric name is required',
        usage: 'GET /api/metrics?metric=<name>&range=<1h|24h|7d|30d>'
      }, { status: 400 });
    }

    // Get metrics data and aggregations
    const [metrics, aggregations] = await Promise.all([
      metricsCollector.getMetrics(metric, timeRange),
      metricsCollector.getMetricsAggregated(metric, timeRange)
    ]);
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      metric,
      timeRange,
      responseTime,
      timestamp: new Date().toISOString(),
      data: metrics,
      aggregations,
      meta: {
        totalPoints: metrics.length,
        dataPoints: metrics.length > 0 ? {
          earliest: metrics[0]?.timestamp,
          latest: metrics[metrics.length - 1]?.timestamp
        } : null
      }
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Metrics API error:', error);
    
    return NextResponse.json({
      error: 'Failed to retrieve metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, value, tags } = body;
    
    if (!name || typeof value !== 'number') {
      return NextResponse.json({
        error: 'Invalid request body',
        required: { name: 'string', value: 'number' },
        optional: { tags: 'object' }
      }, { status: 400 });
    }
    
    await metricsCollector.recordMetric(name, value, { tags });
    
    return NextResponse.json({
      success: true,
      message: 'Metric recorded successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Metrics POST error:', error);
    
    return NextResponse.json({
      error: 'Failed to record metric',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}