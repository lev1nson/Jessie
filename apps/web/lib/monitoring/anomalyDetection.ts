import { metricsCollector } from './metrics';
import { processAlert } from './alerting';

interface MetricPoint {
  timestamp: string;
  value: number;
}

interface AnomalyDetectionResult {
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  baseline: number;
  currentValue: number;
  threshold: number;
}

/**
 * Simple anomaly detection using statistical methods
 */
export class AnomalyDetector {
  private readonly ANOMALY_THRESHOLD_MULTIPLIER = 2.5; // Standard deviations
  private readonly MIN_DATA_POINTS = 10;

  /**
   * Detect anomalies in metric data using statistical analysis
   */
  async detectAnomalies(
    metricName: string,
    timeRange: '1h' | '24h' | '7d' = '24h'
  ): Promise<AnomalyDetectionResult | null> {
    try {
      const metrics = await metricsCollector.getMetrics(metricName, timeRange);
      
      if (metrics.length < this.MIN_DATA_POINTS) {
        return null; // Not enough data for reliable detection
      }

      const values = metrics.map(m => m.value);
      const recent = values.slice(-5); // Last 5 data points
      const historical = values.slice(0, -5); // Historical data for baseline
      
      if (historical.length < this.MIN_DATA_POINTS) {
        return null;
      }

      // Calculate baseline statistics
      const mean = this.calculateMean(historical);
      const stdDev = this.calculateStandardDeviation(historical, mean);
      const currentValue = this.calculateMean(recent);
      
      // Detect anomaly
      const threshold = stdDev * this.ANOMALY_THRESHOLD_MULTIPLIER;
      const deviation = Math.abs(currentValue - mean);
      const isAnomaly = deviation > threshold;
      
      if (!isAnomaly) {
        return {
          isAnomaly: false,
          severity: 'low',
          confidence: 0,
          baseline: mean,
          currentValue,
          threshold
        };
      }

      // Calculate severity and confidence
      const severity = this.calculateSeverity(deviation, threshold);
      const confidence = Math.min(deviation / threshold, 1.0);

      return {
        isAnomaly: true,
        severity,
        confidence,
        baseline: mean,
        currentValue,
        threshold
      };
      
    } catch (error) {
      console.error('Error in anomaly detection:', error);
      return null;
    }
  }

  /**
   * Monitor key metrics for anomalies
   */
  async monitorKeyMetrics(): Promise<void> {
    const keyMetrics = [
      'email_sync_duration',
      'vector_search_response_time',
      'chat_api_response_time',
      'database_query_time',
      'api_error_rate'
    ];

    for (const metric of keyMetrics) {
      try {
        const anomaly = await this.detectAnomalies(metric, '24h');
        
        if (anomaly && anomaly.isAnomaly && anomaly.severity !== 'low') {
          await this.handleAnomaly(metric, anomaly);
        }
      } catch (error) {
        console.error(`Error monitoring metric ${metric}:`, error);
      }
    }
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStandardDeviation(values: number[], mean: number): number {
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateSeverity(deviation: number, threshold: number): 'low' | 'medium' | 'high' {
    const ratio = deviation / threshold;
    if (ratio > 3) return 'high';
    if (ratio > 2) return 'medium';
    return 'low';
  }

  private async handleAnomaly(metricName: string, anomaly: AnomalyDetectionResult): Promise<void> {
    const alertMessage = this.generateAnomalyAlert(metricName, anomaly);
    
    // Send alert based on severity
    const conditionKey = `anomaly_${metricName}`;
    await processAlert(
      conditionKey,
      'anomaly_detection',
      'anomaly_detected',
      alertMessage
    );
  }

  private generateAnomalyAlert(metricName: string, anomaly: AnomalyDetectionResult): string {
    const change = ((anomaly.currentValue - anomaly.baseline) / anomaly.baseline * 100).toFixed(1);
    const direction = anomaly.currentValue > anomaly.baseline ? 'increased' : 'decreased';
    
    return `Anomaly detected in ${metricName}: Current value ${anomaly.currentValue.toFixed(2)} has ${direction} by ${Math.abs(Number(change))}% from baseline ${anomaly.baseline.toFixed(2)}. Confidence: ${(anomaly.confidence * 100).toFixed(1)}%`;
  }
}

/**
 * Cost monitoring for external APIs
 */
export class CostMonitor {
  private readonly DAILY_LIMITS = {
    openai_tokens: 100000, // 100k tokens per day
    gmail_api_calls: 10000, // 10k API calls per day
    vector_operations: 50000 // 50k vector operations per day
  };

  async monitorDailyCosts(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const tags = { date: today };

    try {
      // Check OpenAI token usage
      const openaiTokens = await this.getDailyMetricSum('chat_tokens_used', tags);
      if (openaiTokens > this.DAILY_LIMITS.openai_tokens * 0.8) { // 80% threshold
        await this.sendCostAlert(
          'openai_tokens',
          openaiTokens,
          this.DAILY_LIMITS.openai_tokens,
          'OpenAI API token usage approaching daily limit'
        );
      }

      // Check Gmail API usage
      const gmailCalls = await this.getDailyMetricSum('gmail_api_calls', tags);
      if (gmailCalls > this.DAILY_LIMITS.gmail_api_calls * 0.8) {
        await this.sendCostAlert(
          'gmail_api_calls',
          gmailCalls,
          this.DAILY_LIMITS.gmail_api_calls,
          'Gmail API usage approaching daily limit'
        );
      }

      // Check vector operations
      const vectorOps = await this.getDailyMetricSum('vector_operations', tags);
      if (vectorOps > this.DAILY_LIMITS.vector_operations * 0.8) {
        await this.sendCostAlert(
          'vector_operations',
          vectorOps,
          this.DAILY_LIMITS.vector_operations,
          'Vector operations approaching daily limit'
        );
      }

    } catch (error) {
      console.error('Error in cost monitoring:', error);
    }
  }

  private async getDailyMetricSum(metricName: string, tags: Record<string, string>): Promise<number> {
    // This would query the metrics database for today's sum
    // For now, return a mock value
    return Math.floor(Math.random() * 1000);
  }

  private async sendCostAlert(
    resource: string,
    current: number,
    limit: number,
    message: string
  ): Promise<void> {
    const usage = (current / limit * 100).toFixed(1);
    const alertMessage = `${message}. Current usage: ${current}/${limit} (${usage}%)`;
    
    await processAlert(
      `cost_limit_${resource}`,
      'cost_monitoring',
      'approaching_limit',
      alertMessage
    );
  }
}

/**
 * Performance trend analysis
 */
export class PerformanceTrendAnalyzer {
  async analyzePerformanceTrends(): Promise<void> {
    const metrics = [
      'email_sync_duration',
      'vector_search_response_time',
      'chat_api_response_time'
    ];

    for (const metric of metrics) {
      try {
        const trend = await this.calculateTrend(metric);
        
        if (trend.isSignificant && trend.direction === 'deteriorating') {
          await this.handlePerformanceDegradation(metric, trend);
        }
      } catch (error) {
        console.error(`Error analyzing trend for ${metric}:`, error);
      }
    }
  }

  private async calculateTrend(metricName: string): Promise<{
    direction: 'improving' | 'stable' | 'deteriorating';
    isSignificant: boolean;
    changePercent: number;
  }> {
    const metrics = await metricsCollector.getMetrics(metricName, '7d');
    
    if (metrics.length < 20) {
      return { direction: 'stable', isSignificant: false, changePercent: 0 };
    }

    const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
    const secondHalf = metrics.slice(Math.floor(metrics.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, m) => sum + m.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.value, 0) / secondHalf.length;
    
    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
    const isSignificant = Math.abs(changePercent) > 20; // 20% change threshold
    
    let direction: 'improving' | 'stable' | 'deteriorating' = 'stable';
    if (isSignificant) {
      direction = changePercent > 0 ? 'deteriorating' : 'improving';
    }

    return { direction, isSignificant, changePercent };
  }

  private async handlePerformanceDegradation(
    metric: string,
    trend: { changePercent: number }
  ): Promise<void> {
    const message = `Performance degradation detected in ${metric}: ${trend.changePercent.toFixed(1)}% increase over the last 7 days`;
    
    await processAlert(
      `performance_trend_${metric}`,
      'performance_monitoring',
      'degradation_detected',
      message
    );
  }
}

// Export singleton instances
export const anomalyDetector = new AnomalyDetector();
export const costMonitor = new CostMonitor();
export const performanceTrendAnalyzer = new PerformanceTrendAnalyzer();