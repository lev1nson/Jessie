'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Activity } from 'lucide-react';

interface HealthCheck {
  name: string;
  healthy: boolean;
  status: string;
  responseTime?: number;
  timestamp: string;
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

const ServiceStatus = ({ 
  name, 
  description, 
  status 
}: { 
  name: string; 
  description: string;
  status: HealthCheck;
}) => {
  const getStatusIcon = () => {
    if (status.healthy) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusText = () => {
    if (status.healthy) {
      return 'Operational';
    }
    return 'Experiencing Issues';
  };

  const getStatusColor = () => {
    if (status.healthy) {
      return 'text-green-600';
    }
    return 'text-red-600';
  };

  return (
    <div className="flex items-center justify-between py-4 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </div>
      <div className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </div>
    </div>
  );
};

const StatusBanner = ({ overall }: { overall: string }) => {
  const getBannerContent = () => {
    switch (overall) {
      case 'healthy':
        return {
          icon: <CheckCircle className="h-6 w-6 text-green-500" />,
          title: 'All Systems Operational',
          description: 'All services are running normally',
          bgColor: 'bg-green-50 border-green-200',
          textColor: 'text-green-800'
        };
      case 'unhealthy':
        return {
          icon: <XCircle className="h-6 w-6 text-red-500" />,
          title: 'Service Disruption',
          description: 'Some services are experiencing issues',
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-800'
        };
      default:
        return {
          icon: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
          title: 'Checking Systems',
          description: 'System status is being verified',
          bgColor: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-800'
        };
    }
  };

  const banner = getBannerContent();

  return (
    <Card className={`${banner.bgColor} border ${banner.textColor}`}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          {banner.icon}
          <div>
            <h2 className="text-xl font-semibold">{banner.title}</h2>
            <p className="text-sm opacity-90">{banner.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const UptimeChart = ({ timeRange }: { timeRange: string }) => {
  // Mock uptime data - in real implementation, this would fetch from metrics API
  const uptimePercentage = 99.9;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Uptime ({timeRange})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-green-600 mb-2">
          {uptimePercentage}%
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-green-500 h-2 rounded-full" 
            style={{ width: `${uptimePercentage}%` }}
          ></div>
        </div>
        <div className="text-sm text-muted-foreground">
          {timeRange === '30d' ? '30 days' : timeRange === '90d' ? '90 days' : '7 days'} uptime history
        </div>
      </CardContent>
    </Card>
  );
};

const IncidentHistory = () => {
  // Mock incident data - in real implementation, this would fetch from a database
  const incidents = [
    {
      id: 1,
      title: 'Email Sync Temporarily Delayed',
      status: 'resolved',
      date: '2025-07-27T15:30:00Z',
      impact: 'minor'
    },
    {
      id: 2,
      title: 'Planned Maintenance - Database Optimization',
      status: 'completed',
      date: '2025-07-25T02:00:00Z',
      impact: 'none'
    }
  ];

  const getIncidentBadge = (status: string, impact: string) => {
    if (status === 'resolved' || status === 'completed') {
      return <Badge variant="outline" className="bg-green-50 text-green-700">Resolved</Badge>;
    }
    if (impact === 'major') {
      return <Badge variant="destructive">Major</Badge>;
    }
    if (impact === 'minor') {
      return <Badge variant="secondary" className="bg-yellow-50 text-yellow-700">Minor</Badge>;
    }
    return <Badge variant="outline">Maintenance</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Incidents</CardTitle>
      </CardHeader>
      <CardContent>
        {incidents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent incidents to report</p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((incident) => (
              <div key={incident.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div>
                  <div className="font-medium">{incident.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(incident.date).toLocaleDateString()} at{' '}
                    {new Date(incident.date).toLocaleTimeString()}
                  </div>
                </div>
                {getIncidentBadge(incident.status, incident.impact)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function StatusPage() {
  const [status, setStatus] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/health');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch system status');
        }
        
        setStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
            <div className="h-32 bg-gray-200 rounded mb-6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-4">Jessie System Status</h1>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700">Unable to load system status: {error}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Jessie System Status</h1>
          <p className="text-muted-foreground">
            Current status and uptime for all Jessie services
          </p>
        </div>

        {status && (
          <React.Fragment>
            <div className="mb-8">
              <StatusBanner overall={status.status} />
            </div>

            <div className="grid gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Service Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ServiceStatus 
                    name="Email Processing" 
                    description="Gmail synchronization and email indexing"
                    status={status.checks.cron} 
                  />
                  <ServiceStatus 
                    name="Chat Interface" 
                    description="AI-powered email search and chat"
                    status={status.checks.openai} 
                  />
                  <ServiceStatus 
                    name="Search Engine" 
                    description="Vector-based email search functionality"
                    status={status.checks.database} 
                  />
                  <ServiceStatus 
                    name="Authentication" 
                    description="Google OAuth and user management"
                    status={status.checks.gmail} 
                  />
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <UptimeChart timeRange="30d" />
                <IncidentHistory />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Last Updated</div>
                      <div className="font-medium">
                        {new Date(status.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Response Time</div>
                      <div className="font-medium">{status.responseTime}ms</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Environment</div>
                      <div className="font-medium capitalize">{status.environment}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </React.Fragment>
        )}

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            Subscribe to status updates via email or follow us for real-time notifications.
          </p>
          <p className="mt-2">
            For support, contact{' '}
            <a href="mailto:support@jessie.ai" className="text-blue-600 hover:underline">
              support@jessie.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}