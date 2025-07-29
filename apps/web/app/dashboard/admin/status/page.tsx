'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import PerformanceMetrics from '@/components/admin/PerformanceMetrics';
import AdvancedMonitoring from '@/components/admin/AdvancedMonitoring';

interface HealthCheck {
  name: string;
  healthy: boolean;
  status: string;
  responseTime?: number;
  timestamp: string;
  details?: any;
  error?: string;
}

interface SystemHealth {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
  responseTime: number;
  checks: Record<string, HealthCheck>;
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
  };
}

const StatusIcon = ({ healthy }: { healthy: boolean }) => {
  if (healthy) {
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  }
  return <XCircle className="h-5 w-5 text-red-500" />;
};

const StatusBadge = ({ status, healthy }: { status: string; healthy: boolean }) => {
  const variant = healthy ? 'default' : 'destructive';
  const color = healthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  
  return (
    <Badge variant={variant} className={color}>
      {status}
    </Badge>
  );
};

const StatusCard = ({ title, check }: { title: string; check: HealthCheck }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <StatusIcon healthy={check.healthy} />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <StatusBadge status={check.status} healthy={check.healthy} />
            {check.responseTime && (
              <span className="text-xs text-muted-foreground">
                {check.responseTime}ms
              </span>
            )}
          </div>
          
          {check.error && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              {check.error}
            </div>
          )}
          
          {check.details && (
            <div className="text-xs text-muted-foreground">
              <details>
                <summary className="cursor-pointer">Details</summary>
                <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-auto">
                  {JSON.stringify(check.details, null, 2)}
                </pre>
              </details>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            Last checked: {new Date(check.timestamp).toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function AdminStatusPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealthStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/health');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Health check failed');
      }
      
      setHealth(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchHealthStatus();
    
    const interval = setInterval(fetchHealthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getOverallStatusIcon = () => {
    if (!health) return <Loader2 className="h-6 w-6 animate-spin" />;
    
    if (health.status === 'healthy') {
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    } else if (health.status === 'unhealthy') {
      return <XCircle className="h-6 w-6 text-red-500" />;
    } else {
      return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
    }
  };

  const getOverallStatusColor = () => {
    if (!health) return 'bg-gray-100 text-gray-800';
    
    if (health.status === 'healthy') {
      return 'bg-green-100 text-green-800';
    } else if (health.status === 'unhealthy') {
      return 'bg-red-100 text-red-800';
    } else {
      return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">System Status Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring of all system components
          </p>
        </div>
        
        <Button 
          onClick={fetchHealthStatus} 
          disabled={loading}
          variant="outline"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {health && (
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="status">System Status</TabsTrigger>
            <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Monitoring</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="space-y-6">
            {/* Overall Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getOverallStatusIcon()}
                  Overall System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Badge className={getOverallStatusColor()}>
                      {health.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Response Time</div>
                    <div className="text-lg font-semibold">{health.responseTime}ms</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Healthy Components</div>
                    <div className="text-lg font-semibold text-green-600">
                      {health.summary.healthy}/{health.summary.total}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Environment</div>
                    <div className="text-lg font-semibold">{health.environment}</div>
                  </div>
                </div>
                
                <div className="mt-4 text-sm text-muted-foreground">
                  <div>Version: {health.version}</div>
                  <div>Last updated: {new Date(health.timestamp).toLocaleString()}</div>
                  <div>Auto-refresh: {lastRefresh.toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>

            {/* Component Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatusCard 
                title="Database" 
                check={health.checks.database}
              />
              <StatusCard 
                title="Gmail API" 
                check={health.checks.gmail}
              />
              <StatusCard 
                title="OpenAI API" 
                check={health.checks.openai}
              />
              <StatusCard 
                title="Email Sync" 
                check={health.checks.cron}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="metrics">
            <PerformanceMetrics />
          </TabsContent>
          
          <TabsContent value="advanced">
            <AdvancedMonitoring />
          </TabsContent>
        </Tabs>
      )}

      {loading && !health && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading system status...</span>
        </div>
      )}
    </div>
  );
}