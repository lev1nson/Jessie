'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface MetricData {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: string;
}

interface MetricAggregations {
  avg: number;
  min: number;
  max: number;
  p95: number;
  count: number;
}

interface MetricResponse {
  metric: string;
  timeRange: string;
  responseTime: number;
  timestamp: string;
  data: MetricData[];
  aggregations: MetricAggregations;
  meta: {
    totalPoints: number;
    dataPoints: {
      earliest: string;
      latest: string;
    } | null;
  };
}

const MetricCard = ({ 
  title, 
  metric, 
  unit = '', 
  timeRange 
}: { 
  title: string; 
  metric: string; 
  unit?: string;
  timeRange: string;
}) => {
  const [data, setData] = useState<MetricResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetric = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/metrics?metric=${metric}&range=${timeRange}`);
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch metric');
        }
        
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMetric();
  }, [metric, timeRange]);

  const formatValue = (value: number) => {
    if (unit === 'ms') {
      return value < 1000 ? `${value.toFixed(0)}ms` : `${(value / 1000).toFixed(2)}s`;
    }
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  const getTrendIcon = () => {
    if (!data || data.aggregations.count < 2) return <Activity className="h-4 w-4" />;
    
    const recent = data.data.slice(-10);
    const older = data.data.slice(-20, -10);
    
    if (recent.length === 0 || older.length === 0) return <Activity className="h-4 w-4" />;
    
    const recentAvg = recent.reduce((sum, point) => sum + point.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, point) => sum + point.value, 0) / older.length;
    
    if (recentAvg > olderAvg * 1.1) {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    } else if (recentAvg < olderAvg * 0.9) {
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    }
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Loader2 className="h-4 w-4 animate-spin" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Activity className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.aggregations.count === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Activity className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">No data</div>
          <p className="text-xs text-muted-foreground">
            No metrics available for {timeRange}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {getTrendIcon()}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(data.aggregations.avg)}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground">
          <div>Min: {formatValue(data.aggregations.min)}</div>
          <div>Max: {formatValue(data.aggregations.max)}</div>
          <div>P95: {formatValue(data.aggregations.p95)}</div>
          <div>Count: {data.aggregations.count}</div>
        </div>
        {data.meta.dataPoints && (
          <p className="text-xs text-muted-foreground mt-2">
            Data from {new Date(data.meta.dataPoints.earliest).toLocaleString()} 
            to {new Date(data.meta.dataPoints.latest).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default function PerformanceMetrics() {
  const [timeRange, setTimeRange] = useState<string>('24h');

  const metrics = [
    {
      title: 'Email Sync Duration',
      metric: 'email_sync_duration',
      unit: 'ms'
    },
    {
      title: 'Vector Search Response Time',
      metric: 'vector_search_response_time',
      unit: 'ms'
    },
    {
      title: 'Chat API Response Time',
      metric: 'chat_api_response_time',
      unit: 'ms'
    },
    {
      title: 'Database Query Time',
      metric: 'database_query_time',
      unit: 'ms'
    },
    {
      title: 'Emails Processed Per Hour',
      metric: 'emails_processed_per_hour',
      unit: ''
    },
    {
      title: 'API Error Rate',
      metric: 'api_error_rate',
      unit: '%'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Metrics</h2>
          <p className="text-muted-foreground">
            System performance and usage statistics
          </p>
        </div>
        
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">1 Hour</SelectItem>
            <SelectItem value="24h">24 Hours</SelectItem>
            <SelectItem value="7d">7 Days</SelectItem>
            <SelectItem value="30d">30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.slice(0, 6).map((metric) => (
              <MetricCard
                key={metric.metric}
                title={metric.title}
                metric={metric.metric}
                unit={metric.unit}
                timeRange={timeRange}
              />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.filter(m => m.unit === 'ms').map((metric) => (
              <MetricCard
                key={metric.metric}
                title={metric.title}
                metric={metric.metric}
                unit={metric.unit}
                timeRange={timeRange}
              />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.filter(m => m.unit === '' || m.unit === '%').map((metric) => (
              <MetricCard
                key={metric.metric}
                title={metric.title}
                metric={metric.metric}
                unit={metric.unit}
                timeRange={timeRange}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}