# 🚀 Developer Quick Reference - Epic 4

## ⚡ TLDR - What to do RIGHT NOW

### 🔴 **GET THESE FIRST** (before deployment):
```bash
1. Supabase project URL + API keys (Dashboard → Settings → API)
2. Google OAuth credentials (Cloud Console → Credentials)  
3. OpenAI API key (OpenAI Dashboard → API Keys)
4. Your Vercel deployment URL (will be: https://project-name.vercel.app)
```

### 🟢 **THEN START HERE** (15 minutes setup):
```bash
1. Copy environment variables to Vercel (see list below)
2. Run database setup SQL in Supabase
3. Configure Google Cloud Console OAuth
4. Test OAuth flow
5. Trigger first email sync
```

### 🎯 Success = User can login → sync emails → chat with data

---

## 📋 CRITICAL CHECKLISTS

### Environment Variables (Copy to Vercel)

⚠️ **ВАЖНО**: Настрой эти переменные в Vercel Dashboard → Settings → Environment Variables ПЕРЕД деплоем!

```bash
# ===== ОБЯЗАТЕЛЬНЫЕ ПЕРЕМЕННЫЕ =====
# Получи эти значения ЗАРАНЕЕ:

# 1. Supabase (из Supabase Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 2. Google OAuth (из Google Cloud Console → Credentials)  
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_here

# 3. OpenAI (из OpenAI Dashboard → API Keys)
OPENAI_API_KEY=sk-proj-your_openai_api_key_here

# 4. NextAuth (генерируй локально)
NEXTAUTH_SECRET=$(openssl rand -hex 32)
NEXTAUTH_URL=https://your-app.vercel.app

# 5. Cron Security (генерируй локально)  
CRON_SECRET=$(openssl rand -hex 32)
```

### 📝 **КАК ПОЛУЧИТЬ КАЖДУЮ ПЕРЕМЕННУЮ:**

#### 1. Supabase Variables
```bash
# Go to: https://supabase.com/dashboard/project/YOUR_PROJECT
# Settings → API → Copy these:
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 2. Google OAuth Credentials  
```bash
# Go to: https://console.cloud.google.com/apis/credentials
# Create OAuth 2.0 Client ID → Web application
# Authorized redirect URIs: https://your-app.vercel.app/auth/callback
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_here
```

#### 3. OpenAI API Key
```bash
# Go to: https://platform.openai.com/api-keys
# Create new secret key
OPENAI_API_KEY=sk-proj-your_key_here
```

#### 4. Generate Secrets Locally
```bash
# Run these commands locally:
NEXTAUTH_SECRET=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 32)
NEXTAUTH_URL=https://your-app.vercel.app  # Your actual Vercel URL
```

### 🚨 **PRE-DEPLOYMENT CHECKLIST**
```bash
# ✅ Проверь что все переменные установлены в Vercel:
# Vercel Dashboard → Project → Settings → Environment Variables
# ✅ Убедись что они применены к "Production" environment
# ✅ Vercel URL установлен в NEXTAUTH_URL и Google OAuth redirect URI
```

### Database Setup (Run in Supabase SQL Editor)
```sql
-- 1. Run: apps/web/supabase-setup.sql
-- 2. Run: apps/db/migrations/20241201_vector_search_function.sql
-- 3. Verify: 
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'emails', 'chats', 'messages');
-- Should return 4 rows
```

### Google Cloud Console Setup
```bash
1. Create project: "jessie-email-assistant"
2. Enable Gmail API
3. OAuth consent screen → Add gmail.readonly scope
4. Create OAuth credentials → Web application
5. Redirect URI: https://your-app.vercel.app/auth/callback
```

---

## 🧪 TESTING COMMANDS

### Test Environment
```bash
curl https://your-app.vercel.app/api/health/env
# Should return: {"status":"ok","missing":[]}
```

### Test OAuth Flow
```bash
1. Go to: https://your-app.vercel.app/auth/login
2. Complete Google OAuth
3. Check database:
SELECT google_access_token IS NOT NULL FROM users WHERE email = 'your@email.com';
# Should return: true
```

### Test Email Sync
```bash
curl -X GET "https://your-app.vercel.app/api/cron/email-sync" \
  -H "Authorization: Bearer your-cron-secret"
# Should return: HTTP 200 with processedUsers > 0
```

### Test Database
```sql
-- Check emails were synced
SELECT user_id, COUNT(*) FROM emails GROUP BY user_id;
-- Should show email count > 0

-- Check no duplicates
SELECT google_message_id, COUNT(*) FROM emails 
GROUP BY google_message_id HAVING COUNT(*) > 1;
-- Should return: no rows
```

---

## ❌ COMMON ERRORS & FIXES

| Error | Cause | Fix |
|-------|-------|-----|
| `redirect_uri_mismatch` | Wrong OAuth URI | Use `/auth/callback` NOT `/api/auth/google/callback` |
| `Unauthorized` cron | Wrong CRON_SECRET | Check environment variable matches header |
| No users with tokens | OAuth not saving tokens | Check `provider_token` saved in callback |
| Empty email sync | No Gmail access | Verify `gmail.readonly` scope granted |
| Database connection fails | Wrong Supabase key | Use SERVICE_ROLE_KEY not ANON_KEY |

---

## 📁 KEY FILES LOCATIONS

```
vercel.json                                    # Deployment config (FIXED)
apps/web/supabase-setup.sql                   # Database schema
apps/web/app/api/auth/google/callback/route.ts # OAuth token storage (FIXED)
apps/web/app/api/cron/email-sync/route.ts     # Email sync logic
apps/web/app/api/indexing/sync/route.ts       # Manual sync endpoint
apps/web/app/api/indexing/cleanup/route.ts    # Database cleanup
VERCEL_DEPLOYMENT.md                           # Full deployment guide
```

---

## 🎯 STORY COMPLETION ORDER

```
Story 4.1: Backend Activation (THIS ONE) - 3-4 hours
  ↓
Story 4.2: Vectorization Integration - 2-3 hours  
  ↓
Story 4.3: Chat API Connection - 1-2 hours
  ↓
Story 4.4: Environment Setup - 1 hour
  ↓
Story 4.5: Monitoring - 1 hour
```

**Total Epic 4 time: ~8-11 hours**

---

## 🆘 EMERGENCY CONTACTS

- **Google API Issues**: Check Google Cloud Console → APIs & Services → Credentials
- **Supabase Issues**: Check Supabase Dashboard → Settings → API  
- **Vercel Issues**: Check Vercel Dashboard → Functions tab for logs
- **OpenAI Issues**: Check OpenAI Dashboard → Usage for quota

---

## ✅ SUCCESS CRITERIA

**Story 4.1 is DONE when:**
- ✅ User can login with Google
- ✅ Cron job runs every hour automatically  
- ✅ Email sync retrieves real Gmail emails
- ✅ No duplicate emails in database
- ✅ Date-based sync UI works
- ✅ Database cleanup works safely

**Next step**: Move to Story 4.2 (Vectorization)