# Google Cloud Configuration for Jessie Email Assistant

## 🚀 Production Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. **Project Name**: `jessie-email-assistant-prod`
4. **Organization**: Your organization (if applicable)
5. Click "Create"

### 2. Enable Required APIs

Navigate to **APIs & Services → Library** and enable:

1. **Gmail API** ✅
   - Search for "Gmail API"
   - Click "Enable"
   - Required for email access

2. **Google+ API** (if needed for profile data)
   - Search for "Google+ API" 
   - Click "Enable"

### 3. Configure OAuth Consent Screen

Go to **APIs & Services → OAuth consent screen**:

#### External Users (Recommended for Production)
```
User Type: External
App name: Jessie Email Assistant
User support email: your-email@domain.com
Developer contact: your-email@domain.com

App domain:
- Application home page: https://your-app.vercel.app
- Application privacy policy: https://your-app.vercel.app/privacy
- Application terms of service: https://your-app.vercel.app/terms

Authorized domains:
- your-app.vercel.app
- vercel.app

Scopes:
- https://www.googleapis.com/auth/gmail.readonly
- https://www.googleapis.com/auth/userinfo.email  
- https://www.googleapis.com/auth/userinfo.profile

Test users (during development):
- your-email@domain.com
- any-other-test-emails@domain.com
```

#### Internal Users (If G Workspace Organization)
```
User Type: Internal
App name: Jessie Email Assistant
User support email: your-email@workspace.com
Developer contact: your-email@workspace.com
```

### 4. Create OAuth 2.0 Credentials

Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**:

```
Application type: Web application
Name: Jessie Production

Authorized JavaScript origins:
- https://your-app.vercel.app
- http://localhost:3000 (for development)

Authorized redirect URIs:
⚠️ CRITICAL - Use exact paths:
- https://your-app.vercel.app/auth/callback
- http://localhost:3000/auth/callback

🚨 DO NOT USE /api/auth/google/callback - this is wrong!
✅ USE /auth/callback - this is correct!
```

**Download the JSON credentials** - you'll need:
- Client ID: `123456789-abc.apps.googleusercontent.com`
- Client Secret: `GOCSPX-your_secret_here`

### 5. Security Configuration

#### Rate Limits & Quotas
1. Go to **APIs & Services → Quotas**
2. Filter by "Gmail API"
3. Default limits are usually sufficient:
   - 1,000,000,000 queries per day
   - 250 queries per user per 100 seconds

#### API Key Restrictions (Optional)
If using API keys (not needed for OAuth):
1. **APIs & Services → Credentials**
2. Edit your API key
3. **Application restrictions**: HTTP referrers
4. **API restrictions**: Gmail API only

### 6. Testing Configuration

#### Test OAuth Flow
1. Set environment variables in your app:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
   ```

2. Test the OAuth callback:
   - Go to: `https://your-app.vercel.app/auth/login`
   - Complete Google sign-in
   - Verify redirect to `/auth/callback` works
   - Check that tokens are saved in database

#### Test Gmail API Access
```bash
# After successful OAuth, test API access:
curl -H "Authorization: Bearer ACCESS_TOKEN" \
  "https://www.googleapis.com/gmail/v1/users/me/profile"
```

### 7. Production Readiness Checklist

- [ ] ✅ Project created with descriptive name
- [ ] ✅ Gmail API enabled  
- [ ] ✅ OAuth consent screen configured
- [ ] ✅ Production domain added to authorized domains
- [ ] ✅ Correct redirect URIs configured (`/auth/callback`)
- [ ] ✅ OAuth credentials generated and saved
- [ ] ✅ Scopes limited to minimum required (`gmail.readonly`)
- [ ] ✅ Environment variables set in Vercel
- [ ] ✅ OAuth flow tested and working
- [ ] ✅ Gmail API access verified

### 8. Monitoring & Maintenance

#### API Usage Monitoring
1. **APIs & Services → Dashboard**
2. Monitor Gmail API usage
3. Set up alerts for quota limits

#### Security Monitoring
1. **IAM & Admin → Audit Logs**
2. Monitor OAuth consent grants
3. Review access patterns

### 9. Cost Management

Google Cloud APIs are generally free for reasonable usage:
- **Gmail API**: Free up to quota limits
- **OAuth**: No additional cost
- **Project**: Free (no compute resources used)

### 10. Troubleshooting

#### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `redirect_uri_mismatch` | Wrong redirect URI | Use `/auth/callback` not `/api/auth/google/callback` |
| `invalid_client` | Wrong credentials | Verify CLIENT_ID and CLIENT_SECRET |
| `access_denied` | User denied permission | Re-authorize with proper scopes |
| `scope_insufficient` | Missing gmail.readonly | Add scope in consent screen |

#### Debug OAuth Flow
```javascript
// Add this to your callback handler for debugging:
console.log('OAuth callback received:', {
  code: searchParams.get('code'),
  state: searchParams.get('state'),
  error: searchParams.get('error')
});
```

### 11. Environment Variables for Vercel

Add these to your Vercel project settings:

```bash
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_here
```

### 12. Next Steps

After Google Cloud setup:
1. ✅ Test complete OAuth flow
2. ✅ Verify Gmail API access  
3. ✅ Test email sync functionality
4. ✅ Monitor for any API errors
5. ✅ Set up usage alerts

## 🆘 Support

- **Google Cloud Support**: [Google Cloud Console Help](https://console.cloud.google.com/support)
- **Gmail API Docs**: [Gmail API Reference](https://developers.google.com/gmail/api)
- **OAuth Docs**: [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)

---

**✅ Success Criteria**: User can log in with Google → App receives Gmail access → Email sync works without errors