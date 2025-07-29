import { NextRequest, NextResponse } from 'next/server';
import { anomalyDetector, costMonitor, performanceTrendAnalyzer } from '@/lib/monitoring/anomalyDetection';
import { recordSystemStatus } from '@/lib/monitoring/metrics';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Check authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('Starting monitoring cron job...');
  
  const results = {
    anomalyDetection: false,
    costMonitoring: false,
    trendAnalysis: false,
    errors: [] as string[]
  };

  try {
    // Record monitoring job start
    await recordSystemStatus('monitoring_cron', 'healthy', {
      status: 'started',
      timestamp: new Date().toISOString()
    });

    // Run anomaly detection
    try {
      await anomalyDetector.monitorKeyMetrics();
      results.anomalyDetection = true;
      console.log('Anomaly detection completed successfully');
    } catch (error) {
      const errorMsg = `Anomaly detection failed: ${error}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
    }

    // Run cost monitoring
    try {
      await costMonitor.monitorDailyCosts();
      results.costMonitoring = true;
      console.log('Cost monitoring completed successfully');
    } catch (error) {
      const errorMsg = `Cost monitoring failed: ${error}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
    }

    // Run performance trend analysis
    try {
      await performanceTrendAnalyzer.analyzePerformanceTrends();
      results.trendAnalysis = true;
      console.log('Performance trend analysis completed successfully');
    } catch (error) {
      const errorMsg = `Trend analysis failed: ${error}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
    }

    const duration = Date.now() - startTime;
    const hasErrors = results.errors.length > 0;
    
    // Record monitoring job completion
    await recordSystemStatus('monitoring_cron', hasErrors ? 'degraded' : 'healthy', {
      status: 'completed',
      duration,
      results,
      errors: results.errors.length
    });

    const response = {
      message: 'Monitoring cron job completed',
      duration,
      results,
      timestamp: new Date().toISOString(),
      ...(hasErrors && { errors: results.errors })
    };

    console.log('Monitoring cron job completed:', response);
    
    return NextResponse.json(response);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Monitoring cron job failed:', error);
    
    // Record critical failure
    await recordSystemStatus('monitoring_cron', 'down', {
      status: 'failed',
      error: String(error),
      duration
    });
    
    return NextResponse.json(
      { 
        error: 'Monitoring cron job failed', 
        details: String(error),
        duration,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}