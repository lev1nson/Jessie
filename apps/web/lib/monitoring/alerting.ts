import { recordSystemStatus } from './metrics';

export interface Alert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  component: string;
  status: string;
  details: string;
  timestamp: string;
}

export interface AlertCondition {
  condition: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  notification: ('email' | 'slack')[];
  cooldown?: number; // minutes
}

// Alert conditions as defined in the story
export const alertConditions: Record<string, AlertCondition> = {
  database_down: {
    condition: 'health.database.healthy === false',
    severity: 'critical',
    notification: ['email', 'slack'],
    cooldown: 60
  },
  email_sync_failed: {
    condition: 'cron.lastStatus === "failed" && timeSince > 2hours',
    severity: 'high',
    notification: ['email', 'slack'],
    cooldown: 30
  },
  api_error_rate_high: {
    condition: 'errorRate > 10% over 5 minutes',
    severity: 'medium',
    notification: ['slack'],
    cooldown: 15
  },
  vector_search_slow: {
    condition: 'avgResponseTime > 5000ms over 10 minutes',
    severity: 'medium',
    notification: ['slack'],
    cooldown: 15
  }
};

/**
 * Send alert to Slack webhook
 */
export async function sendSlackAlert(alert: Alert): Promise<boolean> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhook) {
    console.warn('SLACK_WEBHOOK_URL not configured, skipping Slack alert');
    return false;
  }

  try {
    const message = {
      text: `🚨 ${alert.severity.toUpperCase()}: ${alert.title}`,
      attachments: [{
        color: getSeverityColor(alert.severity),
        fields: [
          { title: 'Component', value: alert.component, short: true },
          { title: 'Status', value: alert.status, short: true },
          { title: 'Details', value: alert.details, short: false },
          { title: 'Time', value: new Date(alert.timestamp).toLocaleString(), short: true }
        ],
        footer: 'Jessie Email Assistant Monitoring',
        ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
      }]
    };

    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      console.error('Failed to send Slack alert:', response.statusText);
      return false;
    }

    console.log(`Slack alert sent successfully: ${alert.title}`);
    return true;
  } catch (error) {
    console.error('Error sending Slack alert:', error);
    return false;
  }
}

/**
 * Send alert via email
 */
export async function sendEmailAlert(alert: Alert): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!adminEmail) {
    console.warn('ADMIN_EMAIL not configured, skipping email alert');
    return false;
  }

  // In a real implementation, this would use a service like SendGrid, Resend, or AWS SES
  console.log(`EMAIL ALERT would be sent to ${adminEmail}:`, {
    subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
    body: `
      Alert Details:
      - Component: ${alert.component}
      - Status: ${alert.status}
      - Severity: ${alert.severity}
      - Time: ${new Date(alert.timestamp).toLocaleString()}
      - Details: ${alert.details}
      
      Please check the admin dashboard for more information.
    `
  });

  // For now, just log it as we don't have email service configured
  return true;
}

/**
 * Process and send alert based on conditions
 */
export async function processAlert(
  conditionKey: string,
  component: string,
  currentStatus: any,
  details: string
): Promise<void> {
  const condition = alertConditions[conditionKey];
  
  if (!condition) {
    console.warn(`Unknown alert condition: ${conditionKey}`);
    return;
  }

  // Check if we should skip due to cooldown
  if (await isInCooldown(conditionKey, condition.cooldown || 0)) {
    console.log(`Alert ${conditionKey} is in cooldown, skipping`);
    return;
  }

  const alert: Alert = {
    id: `${conditionKey}_${Date.now()}`,
    severity: condition.severity,
    title: getAlertTitle(conditionKey),
    component,
    status: currentStatus,
    details,
    timestamp: new Date().toISOString()
  };

  // Send notifications based on configuration
  const results = await Promise.allSettled([
    ...(condition.notification.includes('slack') ? [sendSlackAlert(alert)] : []),
    ...(condition.notification.includes('email') ? [sendEmailAlert(alert)] : [])
  ]);

  // Record the alert in system status
  await recordSystemStatus('alerting_system', 'healthy', {
    alert_sent: true,
    condition: conditionKey,
    severity: alert.severity,
    notifications_sent: results.filter(r => r.status === 'fulfilled' && r.value).length,
    notifications_failed: results.filter(r => r.status === 'rejected' || !r.value).length
  });

  // Record last alert time for cooldown
  await recordLastAlertTime(conditionKey);
}

/**
 * Check if alert is in cooldown period
 */
async function isInCooldown(conditionKey: string, cooldownMinutes: number): Promise<boolean> {
  if (cooldownMinutes === 0) return false;

  try {
    // In a real implementation, this would check a database or cache
    // For now, we'll use a simple in-memory approach
    const lastAlertKey = `last_alert_${conditionKey}`;
    const lastAlertTime = global[lastAlertKey as keyof typeof global] as number | undefined;
    
    if (!lastAlertTime) return false;
    
    const cooldownMs = cooldownMinutes * 60 * 1000;
    return (Date.now() - lastAlertTime) < cooldownMs;
  } catch (error) {
    console.error('Error checking cooldown:', error);
    return false; // If we can't check, err on the side of sending the alert
  }
}

/**
 * Record last alert time for cooldown tracking
 */
async function recordLastAlertTime(conditionKey: string): Promise<void> {
  try {
    const lastAlertKey = `last_alert_${conditionKey}`;
    (global as any)[lastAlertKey] = Date.now();
  } catch (error) {
    console.error('Error recording last alert time:', error);
  }
}

/**
 * Get severity color for Slack attachments
 */
function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'danger';
    case 'high': return 'warning';
    case 'medium': return '#ff9500'; // Orange
    case 'low': return 'good';
    default: return '#808080'; // Gray
  }
}

/**
 * Get human-readable alert title
 */
function getAlertTitle(conditionKey: string): string {
  const titles: Record<string, string> = {
    database_down: 'Database Connection Failed',
    email_sync_failed: 'Email Synchronization Failed',
    api_error_rate_high: 'High API Error Rate Detected',
    vector_search_slow: 'Vector Search Performance Degraded'
  };
  
  return titles[conditionKey] || `System Alert: ${conditionKey}`;
}

/**
 * Monitor system health and trigger alerts
 */
export async function monitorSystemHealth(healthData: any): Promise<void> {
  try {
    // Check database health
    if (!healthData.checks?.database?.healthy) {
      await processAlert(
        'database_down',
        'database',
        healthData.checks.database?.status || 'error',
        healthData.checks.database?.error || 'Database health check failed'
      );
    }

    // Check email sync health (if cron hasn't run in 2+ hours)
    const cronCheck = healthData.checks?.cron;
    if (cronCheck && !cronCheck.healthy && cronCheck.details?.timeSinceLastRunHours > 2) {
      await processAlert(
        'email_sync_failed',
        'email_sync_cron',
        cronCheck.status,
        `Email sync hasn't run for ${cronCheck.details.timeSinceLastRunHours} hours`
      );
    }

    // Additional monitoring logic can be added here for other conditions
    
  } catch (error) {
    console.error('Error in system health monitoring:', error);
    
    // Record monitoring system failure
    await recordSystemStatus('alerting_system', 'degraded', {
      error: 'Health monitoring failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Test alert system by sending a test alert
 */
export async function sendTestAlert(): Promise<boolean> {
  const testAlert: Alert = {
    id: `test_${Date.now()}`,
    severity: 'low',
    title: 'Test Alert - System Monitoring Active',
    component: 'alerting_system',
    status: 'test',
    details: 'This is a test alert to verify the monitoring system is working correctly.',
    timestamp: new Date().toISOString()
  };

  const results = await Promise.allSettled([
    sendSlackAlert(testAlert),
    sendEmailAlert(testAlert)
  ]);

  const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
  
  await recordSystemStatus('alerting_system', 'healthy', {
    test_alert_sent: true,
    notifications_successful: successCount,
    notifications_total: results.length
  });

  return successCount > 0;
}