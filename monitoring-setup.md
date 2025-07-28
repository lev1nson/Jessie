# Monitoring & Alerting Setup for Jessie Email Assistant

## 🔍 Health Monitoring Endpoints

### 1. Basic Health Check
```bash
GET /api/health
```
Returns overall system health including:
- Database connectivity
- Environment variable status  
- Service availability (OpenAI, Google)

### 2. Environment Variables Check
```bash
GET /api/health/env
```
Validates all required environment variables are configured.

### 3. Database Health
```sql
-- Run in Supabase SQL Editor
SELECT * FROM database_health_check();
```
Returns database metrics and system status.

## 📊 Vercel Native Monitoring

### 1. Function Monitoring
- **Dashboard**: Vercel Project → Functions tab
- **Metrics**: Execution time, error rate, invocations
- **Alerts**: Set up in Vercel dashboard

### 2. Analytics Setup
```typescript
// Add to apps/web/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 3. Speed Insights
```typescript
// Add to apps/web/app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

## 🚨 Alerting Configuration

### 1. Vercel Alerts
Configure in Vercel Dashboard → Project → Settings → Alerts:

```yaml
Function Errors:
  - Threshold: >5 errors in 1 hour
  - Notification: Email + Slack
  
Function Duration:
  - Threshold: >10s average for 5 minutes
  - Notification: Email
  
Build Failures:
  - Threshold: Any build failure
  - Notification: Email + Slack
```

### 2. Supabase Monitoring
Configure in Supabase Dashboard → Settings → Database:

```yaml
Database CPU:
  - Threshold: >80% for 5 minutes
  - Action: Email notification
  
Connection Pool:
  - Threshold: >90% utilization
  - Action: Scale or optimize queries
  
API Requests:
  - Monitor: Requests per minute
  - Alert: Unusual spikes
```

### 3. OpenAI Usage Monitoring
Configure in OpenAI Dashboard → Usage:

```yaml
Daily Spend Alert: $10
Weekly Spend Alert: $50
Monthly Hard Limit: $100

Rate Limit Monitoring:
  - Track: requests per minute
  - Alert: approaching limits
```

## 📈 Custom Monitoring Dashboard

### 1. Health Check Monitoring Script
```bash
#!/bin/bash
# monitor-health.sh - Run every 5 minutes

HEALTH_URL="https://your-app.vercel.app/api/health"
RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$HEALTH_URL")
HTTP_CODE=$(echo "$RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)

if [ "$HTTP_CODE" != "200" ]; then
    # Send alert (email, Slack, etc.)
    echo "ALERT: Health check failed with HTTP $HTTP_CODE"
    # Add your notification logic here
fi
```

### 2. Database Monitoring Query
```sql
-- Create monitoring view
CREATE OR REPLACE VIEW system_health AS
SELECT 
    NOW() as check_time,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM emails) as total_emails,
    (SELECT COUNT(*) FROM emails WHERE embedding IS NOT NULL) as vectorized_emails,
    (SELECT COUNT(*) FROM users WHERE last_email_sync > NOW() - INTERVAL '24 hours') as recent_syncs,
    pg_database_size(current_database()) as db_size_bytes;

-- Schedule this to run every hour and log results
INSERT INTO system_logs (action, details)
SELECT 'health_check', row_to_json(system_health.*) 
FROM system_health;
```

### 3. Cost Monitoring Script
```typescript
// cost-monitor.ts
export async function checkCosts() {
  // OpenAI usage check
  const openaiUsage = await fetch('https://api.openai.com/v1/usage', {
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
  });
  
  // Supabase usage (if API available)
  const supabaseUsage = await getSupabaseUsage();
  
  // Vercel usage (if API available)  
  const vercelUsage = await getVercelUsage();
  
  const totalCost = calculateTotalCost(openaiUsage, supabaseUsage, vercelUsage);
  
  if (totalCost > MONTHLY_BUDGET * 0.8) {
    await sendCostAlert(totalCost);
  }
  
  return { totalCost, breakdown: { openaiUsage, supabaseUsage, vercelUsage } };
}
```

## 🔧 Performance Monitoring

### 1. Core Web Vitals
Track automatically with Vercel Speed Insights:
- **LCP** (Largest Contentful Paint): <2.5s
- **FID** (First Input Delay): <100ms  
- **CLS** (Cumulative Layout Shift): <0.1

### 2. API Performance
```typescript
// Add to API routes
import { performance } from 'perf_hooks';

export async function GET() {
  const start = performance.now();
  
  try {
    // Your API logic here
    const result = await processRequest();
    
    const duration = performance.now() - start;
    
    // Log slow queries
    if (duration > 5000) {
      console.warn(`Slow API response: ${duration}ms`);
    }
    
    return NextResponse.json({
      ...result,
      _meta: { duration: Math.round(duration) }
    });
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`API error after ${duration}ms:`, error);
    throw error;
  }
}
```

### 3. Database Performance
```sql
-- Monitor slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements 
WHERE mean_time > 1000  -- queries taking >1 second
ORDER BY mean_time DESC
LIMIT 10;

-- Monitor index usage
SELECT 
    indexrelname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0  -- unused indexes
   OR idx_tup_read = 0;  -- indexes not being read
```

## 📱 Incident Response

### 1. Alert Levels
```yaml
CRITICAL (P0):
  - Service completely down
  - Data loss risk
  - Security breach
  Response: Immediate (< 15 minutes)
  
HIGH (P1):
  - Partial service outage
  - Performance degradation >50%
  - High error rates
  Response: Within 1 hour
  
MEDIUM (P2):
  - Minor performance issues
  - Non-critical features affected
  Response: Within 4 hours
  
LOW (P3):
  - Cosmetic issues
  - Feature requests
  Response: Next business day
```

### 2. Incident Checklist
```markdown
## Incident Response Steps

1. **Identify & Assess**
   - [ ] Determine severity level
   - [ ] Identify affected systems
   - [ ] Estimate user impact
   
2. **Immediate Response**
   - [ ] Alert team members
   - [ ] Check error logs
   - [ ] Review recent deployments
   
3. **Investigation**
   - [ ] Run health checks
   - [ ] Check third-party services
   - [ ] Review monitoring dashboards
   
4. **Resolution**
   - [ ] Apply fix or rollback
   - [ ] Verify resolution
   - [ ] Monitor for stability
   
5. **Post-Incident**
   - [ ] Document root cause
   - [ ] Update monitoring
   - [ ] Improve prevention
```

## 📊 Reporting & Analytics

### 1. Daily Health Report
```bash
#!/bin/bash
# daily-report.sh - Run via cron at 9 AM daily

echo "📊 Jessie Daily Health Report - $(date)"
echo "================================="

# System health
curl -s "https://your-app.vercel.app/api/health" | jq '.components'

# Environment status
curl -s "https://your-app.vercel.app/api/health/env" | jq '.summary'

# Database stats (via API or direct query)
echo "Database metrics:"
echo "- Users: $(supabase db query 'SELECT COUNT(*) FROM users')"
echo "- Emails: $(supabase db query 'SELECT COUNT(*) FROM emails')"
echo "- Recent syncs: $(supabase db query 'SELECT COUNT(*) FROM users WHERE last_email_sync > NOW() - INTERVAL \"24 hours\"')"
```

### 2. Weekly Performance Report
```typescript
// weekly-report.ts
export async function generateWeeklyReport() {
  const report = {
    period: `${startDate} to ${endDate}`,
    metrics: {
      uptime: await calculateUptime(),
      avgResponseTime: await getAverageResponseTime(),
      errorRate: await getErrorRate(),
      newUsers: await getNewUserCount(),
      emailsProcessed: await getEmailCount(),
      costs: await getCostBreakdown()
    },
    issues: await getResolvedIssues(),
    improvements: await getPerformanceImprovements()
  };
  
  return report;
}
```

## 🚀 Deployment Pipeline Monitoring

### 1. Build Monitoring
```yaml
# In .github/workflows/deploy.yml
- name: Monitor Build Performance
  run: |
    start_time=$(date +%s)
    npm run build
    end_time=$(date +%s)
    build_duration=$((end_time - start_time))
    
    if [ $build_duration -gt 300 ]; then
      echo "⚠️ Build took ${build_duration}s (>5min)"
    fi
```

### 2. Deployment Health Check
```bash
# Post-deployment validation
#!/bin/bash
echo "🔍 Post-deployment health check..."

# Wait for deployment to be ready
sleep 30

# Run comprehensive tests
./test-deployment.sh $VERCEL_URL

# Check specific functionality
echo "Testing email sync endpoint..."
curl -f "$VERCEL_URL/api/cron/email-sync" \
  -H "Authorization: Bearer $CRON_SECRET" || exit 1

echo "✅ Deployment health check complete"
```

## 📋 Monitoring Checklist

### Production Readiness
- [ ] ✅ Health endpoints configured and tested
- [ ] ✅ Vercel monitoring enabled (Analytics + Speed Insights)
- [ ] ✅ Database monitoring setup in Supabase
- [ ] ✅ OpenAI usage alerts configured
- [ ] ✅ GitHub Actions deployment pipeline
- [ ] ✅ Error tracking and logging
- [ ] ✅ Performance baselines established
- [ ] ✅ Incident response procedures documented
- [ ] ✅ Daily/weekly reporting scripts
- [ ] ✅ Cost monitoring and alerts

### Next Steps
1. ✅ Deploy monitoring configuration
2. ✅ Test all alert channels
3. ✅ Establish baseline metrics
4. ✅ Create monitoring dashboard
5. ✅ Train team on incident response

---

**✅ Success Criteria**: All monitoring systems operational → Alerts tested and working → Team ready to respond to incidents