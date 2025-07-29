import { createClient } from '@/lib/supabase-server';

export interface MetricOptions {
  tags?: Record<string, string>;
  timestamp?: Date;
}

export interface MetricData {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: string;
}

export class MetricsCollector {
  private supabase = createClient();

  /**
   * Record a single metric
   */
  async recordMetric(
    name: string, 
    value: number, 
    options: MetricOptions = {}
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('metrics')
        .insert({
          name,
          value,
          tags: options.tags || {},
          timestamp: (options.timestamp || new Date()).toISOString()
        });

      if (error) {
        console.error('Failed to record metric:', error);
      }

      // Also send to external monitoring if configured
      if (process.env.DATADOG_API_KEY) {
        await this.sendToDatadog(name, value, options.tags);
      }
    } catch (error) {
      console.error('Error recording metric:', error);
    }
  }

  /**
   * Record multiple metrics in a batch
   */
  async recordMetricsBatch(metrics: MetricData[]): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('metrics')
        .insert(metrics);

      if (error) {
        console.error('Failed to record metrics batch:', error);
      }
    } catch (error) {
      console.error('Error recording metrics batch:', error);
    }
  }

  /**
   * Get metrics for a specific name and time range
   */
  async getMetrics(
    name: string, 
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<MetricData[]> {
    try {
      const timeRangeMap = {
        '1h': '1 hour',
        '24h': '24 hours', 
        '7d': '7 days',
        '30d': '30 days'
      };

      const { data, error } = await this.supabase
        .from('metrics')
        .select('*')
        .eq('name', name)
        .gte('timestamp', new Date(Date.now() - this.parseTimeRange(timeRange)).toISOString())
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Failed to get metrics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting metrics:', error);
      return [];
    }
  }

  /**
   * Get aggregated metrics (avg, min, max, p95)
   */
  async getMetricsAggregated(
    name: string,
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
  ) {
    const metrics = await this.getMetrics(name, timeRange);
    
    if (metrics.length === 0) {
      return {
        avg: 0,
        min: 0,
        max: 0,
        p95: 0,
        count: 0
      };
    }

    const values = metrics.map(m => m.value);
    values.sort((a, b) => a - b);

    return {
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      p95: values[Math.floor(values.length * 0.95)] || values[values.length - 1],
      count: values.length
    };
  }

  /**
   * Record system status
   */
  async recordSystemStatus(
    component: string,
    status: 'healthy' | 'degraded' | 'down' | 'warning',
    details: Record<string, any> = {}
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('system_status')
        .insert({
          component,
          status,
          details,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to record system status:', error);
      }
    } catch (error) {
      console.error('Error recording system status:', error);
    }
  }

  /**
   * Get latest system status for all components
   */
  async getSystemStatus(): Promise<Array<{
    component: string;
    status: string;
    details: any;
    timestamp: string;
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('system_status')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Failed to get system status:', error);
        return [];
      }

      // Group by component and get the latest status for each
      const latestStatus = new Map();
      data?.forEach(record => {
        if (!latestStatus.has(record.component)) {
          latestStatus.set(record.component, record);
        }
      });

      return Array.from(latestStatus.values());
    } catch (error) {
      console.error('Error getting system status:', error);
      return [];
    }
  }

  private parseTimeRange(timeRange: string): number {
    const timeRangeMap = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    return timeRangeMap[timeRange as keyof typeof timeRangeMap] || timeRangeMap['24h'];
  }

  private async sendToDatadog(
    name: string, 
    value: number, 
    tags?: Record<string, string>
  ): Promise<void> {
    try {
      const response = await fetch('https://api.datadoghq.com/api/v1/series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': process.env.DATADOG_API_KEY!
        },
        body: JSON.stringify({
          series: [{
            metric: `jessie.${name}`,
            points: [[Math.floor(Date.now() / 1000), value]],
            tags: tags ? Object.entries(tags).map(([k, v]) => `${k}:${v}`) : []
          }]
        })
      });

      if (!response.ok) {
        console.error('Failed to send to Datadog:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending to Datadog:', error);
    }
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();

// Convenience functions for common metrics
export const recordMetric = (name: string, value: number, options?: MetricOptions) => 
  metricsCollector.recordMetric(name, value, options);

export const recordSystemStatus = (component: string, status: 'healthy' | 'degraded' | 'down' | 'warning', details?: Record<string, any>) =>
  metricsCollector.recordSystemStatus(component, status, details);