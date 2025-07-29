'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle, 
  Activity,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface SystemStatusEntry {
  component: string;
  status: string;
  details: any;
  timestamp: string;
}

export default function AdvancedMonitoring() {
  const [systemStatus, setSystemStatus] = useState<SystemStatusEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingAlert, setTestingAlert] = useState(false);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, this would fetch from the metrics API
      // For now, we'll show mock data structure
      const mockStatus: SystemStatusEntry[] = [
        {
          component: 'anomaly_detection',
          status: 'healthy',
          details: {
            lastRun: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            anomaliesDetected: 0,
            metricsAnalyzed: 5
          },
          timestamp: new Date().toISOString()
        },
        {
          component: 'cost_monitoring',
          status: 'healthy',
          details: {
            openaiUsage: 45.2,
            gmailApiUsage: 23.1,
            vectorOperations: 78.5,
            limits: {
              openai: 100,
              gmail: 100,
              vector: 100
            }
          },
          timestamp: new Date().toISOString()
        },
        {
          component: 'performance_trends',
          status: 'healthy',
          details: {
            emailSyncTrend: 'stable',
            searchResponseTrend: 'improving',
            chatApiTrend: 'stable'
          },
          timestamp: new Date().toISOString()
        }
      ];
      
      setSystemStatus(mockStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const sendTestAlert = async () => {
    try {
      setTestingAlert(true);
      
      const response = await fetch('/api/monitoring/test-alert', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'development'}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Test alert sent successfully! Check your configured notification channels.');
      } else {
        alert(`Failed to send test alert: ${result.message}`);
      }
    } catch (error) {
      alert(`Error sending test alert: ${error}`);
    } finally {
      setTestingAlert(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchSystemStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>;
      case 'down':
        return <Badge className="bg-red-100 text-red-800">Down</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const CostMonitoringCard = ({ data }: { data: any }) => {
    const getUsageColor = (usage: number) => {
      if (usage >= 80) return 'text-red-600';
      if (usage >= 60) return 'text-yellow-600';
      return 'text-green-600';
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            API Cost Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {data.openaiUsage}%
                </div>
                <div className="text-sm text-muted-foreground">OpenAI Tokens</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${data.openaiUsage}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {data.gmailApiUsage}%
                </div>
                <div className="text-sm text-muted-foreground">Gmail API</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${data.gmailApiUsage}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {data.vectorOperations}%
                </div>
                <div className="text-sm text-muted-foreground">Vector Ops</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: `${data.vectorOperations}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {Math.max(data.openaiUsage, data.gmailApiUsage, data.vectorOperations) > 80 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  One or more services are approaching their daily limits. Consider optimizing usage.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const PerformanceTrendsCard = ({ data }: { data: any }) => {
    const getTrendIcon = (trend: string) => {
      switch (trend) {
        case 'improving':
          return <TrendingDown className="h-4 w-4 text-green-500" />;
        case 'deteriorating':
          return <TrendingUp className="h-4 w-4 text-red-500" />;
        default:
          return <Activity className="h-4 w-4 text-gray-500" />;
      }
    };

    const getTrendColor = (trend: string) => {
      switch (trend) {
        case 'improving':
          return 'text-green-600';
        case 'deteriorating':
          return 'text-red-600';
        default:
          return 'text-gray-600';
      }
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends (7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Email Sync Performance</span>
              <div className="flex items-center gap-2">
                {getTrendIcon(data.emailSyncTrend)}
                <span className={`text-sm capitalize ${getTrendColor(data.emailSyncTrend)}`}>
                  {data.emailSyncTrend}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Search Response Time</span>
              <div className="flex items-center gap-2">
                {getTrendIcon(data.searchResponseTrend)}
                <span className={`text-sm capitalize ${getTrendColor(data.searchResponseTrend)}`}>
                  {data.searchResponseTrend}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Chat API Performance</span>
              <div className="flex items-center gap-2">
                {getTrendIcon(data.chatApiTrend)}
                <span className={`text-sm capitalize ${getTrendColor(data.chatApiTrend)}`}>
                  {data.chatApiTrend}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading advanced monitoring data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading monitoring data: {error}
        </AlertDescription>
      </Alert>
    );
  }

  const anomalyData = systemStatus.find(s => s.component === 'anomaly_detection');
  const costData = systemStatus.find(s => s.component === 'cost_monitoring');
  const trendsData = systemStatus.find(s => s.component === 'performance_trends');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Monitoring</h2>
          <p className="text-muted-foreground">
            Anomaly detection, cost monitoring, and performance analysis
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={sendTestAlert} 
            disabled={testingAlert}
            variant="outline"
          >
            {testingAlert ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            Test Alert
          </Button>
          
          <Button 
            onClick={fetchSystemStatus} 
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="anomalies">Anomaly Detection</TabsTrigger>
          <TabsTrigger value="costs">Cost Monitoring</TabsTrigger>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Anomaly Detection</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {getStatusBadge(anomalyData?.status || 'unknown')}
                {anomalyData && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Last run: {new Date(anomalyData.details.lastRun).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cost Monitoring</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {getStatusBadge(costData?.status || 'unknown')}
                {costData && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Highest usage: {Math.max(
                      costData.details.openaiUsage,
                      costData.details.gmailApiUsage,
                      costData.details.vectorOperations
                    ).toFixed(1)}%
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance Trends</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {getStatusBadge(trendsData?.status || 'unknown')}
                {trendsData && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Trends analyzed for key metrics
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="anomalies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Anomaly Detection Status</CardTitle>
            </CardHeader>
            <CardContent>
              {anomalyData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    {getStatusBadge(anomalyData.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Last Run:</span>
                      <div>{new Date(anomalyData.details.lastRun).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Anomalies Detected:</span>
                      <div>{anomalyData.details.anomaliesDetected}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Metrics Analyzed:</span>
                      <div>{anomalyData.details.metricsAnalyzed}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">No anomaly detection data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="costs" className="space-y-4">
          {costData ? (
            <CostMonitoringCard data={costData.details} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-muted-foreground">No cost monitoring data available</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-4">
          {trendsData ? (
            <PerformanceTrendsCard data={trendsData.details} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-muted-foreground">No performance trends data available</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}