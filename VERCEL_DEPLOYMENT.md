# 🚀 Vercel Deployment Guide for Jessie Email Assistant

## Pre-deployment Checklist

### ✅ 1. Supabase Setup
1. Create Supabase project
2. Run SQL from `apps/web/supabase-setup.sql` in Supabase SQL Editor
3. Run SQL from `apps/db/migrations/20241201_vector_search_function.sql`
4. Enable pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;`

### ✅ 2. Google Cloud Console Setup
1. Create new project in Google Cloud Console: "jessie-email-assistant"
2. Enable Gmail API in API Library
3. Configure OAuth consent screen:
   - User Type: External (for public use) or Internal (for organization)
   - App name: "Jessie Email Assistant"
   - Scopes: Add https://www.googleapis.com/auth/gmail.readonly
   - Test users: Add your email during development
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Name: "Jessie Production"
   - Authorized redirect URIs:
     - `https://your-app.vercel.app/auth/callback` (NOT /api/auth/google/callback!)
     - `http://localhost:3000/auth/callback` (for local dev)

**🚨 CRITICAL**: Use `/auth/callback` NOT `/api/auth/google/callback` for redirect URI!

### ✅ 3. OpenAI API Setup
1. Create OpenAI account
2. Generate API key
3. Ensure sufficient credits for embeddings

## Vercel Environment Variables

In Vercel dashboard, add these environment variables:

```bash
# Supabase (get from Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI (get from OpenAI dashboard)
OPENAI_API_KEY=sk-...

# NextAuth (generate random strings)
NEXTAUTH_SECRET=your-long-random-string-here
NEXTAUTH_URL=https://your-app.vercel.app

# Cron Security (generate random string)
CRON_SECRET=your-secure-random-cron-secret
```

## Deployment Steps

### 1. Connect Repository
1. Go to Vercel dashboard
2. Click "New Project"
3. Import your GitHub repository
4. Framework preset should auto-detect as "Next.js"

### 2. Configure Build Settings
- **Build Command**: `cd apps/web && npm run build`
- **Output Directory**: `apps/web/.next`
- **Install Command**: `npm install`

### 3. Add Environment Variables
Add all variables listed above in Vercel project settings.

### 4. Deploy
Click "Deploy" - first deployment will take 3-5 minutes.

## Post-Deployment Verification

### 1. Check Application
- [ ] Homepage loads correctly
- [ ] Google OAuth login works
- [ ] Settings page accessible

### 2. Test API Endpoints
- [ ] `/api/auth/google/login` returns redirect
- [ ] `/api/indexing/stats` requires authentication
- [ ] `/api/indexing/sync` works with POST request

### 3. Verify Cron Job
- [ ] Check Vercel Functions tab for cron job
- [ ] Manually trigger via Vercel dashboard
- [ ] Monitor logs for successful execution

### 4. Database Check
- [ ] Users can authenticate and create profiles
- [ ] **CRITICAL**: Google tokens saved in users table after OAuth
- [ ] Email sync saves emails to database
- [ ] Vector search function works

### 5. Google API Integration Check
- [ ] OAuth flow completes successfully 
- [ ] User grants gmail.readonly permission
- [ ] Access and refresh tokens saved to database
- [ ] Cron job can access user's Gmail
- [ ] Email sync retrieves actual user emails

## Troubleshooting

### Build Errors
```bash
# If build fails, check:
1. All dependencies in package.json
2. TypeScript errors: npm run type-check
3. Environment variables set correctly
```

### Runtime Errors
```bash
# Common issues:
1. Missing environment variables
2. Supabase RLS policies blocking access
3. Google OAuth redirect URI mismatch
4. OpenAI API quota exceeded
```

### Cron Job Issues
```bash
# If cron job fails:
1. Check CRON_SECRET matches environment variable
2. Verify Gmail API credentials work
3. Check function timeout limits (5 minutes max)
4. Monitor Vercel function logs
5. CRITICAL: Verify Google tokens saved in database
6. Check OAuth callback saves provider_token and provider_refresh_token
```

### Google API Issues
```bash
# If Google integration fails:
1. Verify OAuth consent screen approved (if public)
2. Check redirect URI matches exactly: /auth/callback
3. Confirm gmail.readonly scope granted
4. Verify tokens saved in users.google_access_token
5. Test token refresh mechanism
6. Check Gmail API quota limits
```

## Performance Optimization

### 1. Function Timeouts
- Cron job: 5 minutes (300s) for large email batches
- API routes: 30s for normal operations

### 2. Database Optimization
- HNSW indexes created for vector search
- Proper indexes on user_id, date_sent
- RLS policies for data isolation

### 3. Cost Management
- Duplicate email prevention reduces OpenAI costs
- Incremental sync from last email date
- Database cleanup for testing

## Monitoring

### 1. Vercel Analytics
- Function execution times
- Error rates
- Resource usage

### 2. Application Logs
- Email sync success/failure
- Vectorization progress
- User authentication events

### 3. Database Monitoring
- Email count growth
- Vector search performance
- Storage usage

## Security Checklist

- [ ] All secrets in environment variables (not code)
- [ ] Supabase RLS policies active
- [ ] CRON_SECRET protects cron endpoints
- [ ] Google OAuth restricted to your domain
- [ ] No sensitive data in logs

## Cost Estimation

### OpenAI Costs
- ~$0.0001 per email for embeddings
- 1000 emails = ~$0.10
- Duplicate prevention saves 80%+ costs

### Vercel Costs
- Hobby plan: Free for personal use
- Pro plan: $20/month for production
- Function execution: Generous free tier

### Supabase Costs
- Free tier: 500MB database, 2 million edge function calls
- Pro tier: $25/month for production use

## Success Metrics

After successful deployment:
- [ ] Users can log in and sync emails
- [ ] Cron job runs every hour automatically
- [ ] Chat interface returns real search results
- [ ] No deployment or runtime errors
- [ ] Performance within acceptable limits

## Next Steps

1. Monitor first 24 hours for stability
2. Test with real user accounts
3. Scale up as needed
4. Set up monitoring alerts
5. Plan backup/recovery strategy