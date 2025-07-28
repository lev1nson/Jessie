# OpenAI API Setup for Jessie Email Assistant

## 🚀 Production Account Setup

### 1. Create OpenAI Account

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Verify your phone number and email

### 2. Set Up Billing (Required for Production)

⚠️ **CRITICAL**: Free tier has strict rate limits unsuitable for production

1. Go to **Settings → Billing**
2. Add payment method (credit card)
3. **Recommended**: Set up usage limits to prevent overcharges:
   ```
   Monthly usage limit: $100
   Email alert at: $50
   Hard limit at: $100
   ```

### 3. Generate Production API Key

1. Go to **API Keys** section
2. Click **Create new secret key**
3. **Name**: `jessie-production`
4. **Project**: Default (or create "Jessie Email Assistant")
5. **Permissions**: All (default)
6. **Copy the key**: `sk-proj-your_key_here`

⚠️ **Save immediately** - you won't see it again!

### 4. Model Selection & Cost Optimization

#### For Email Embeddings (Recommended)
```
Model: text-embedding-3-small
Cost: $0.00002 per 1K tokens (~$0.0001 per email)
Rate limit: 3,000 RPM, 1,000,000 TPM
Best for: High volume, cost-effective embeddings
```

#### Alternative (Higher Quality)
```  
Model: text-embedding-3-large
Cost: $0.00013 per 1K tokens (~$0.0006 per email)
Use case: Higher accuracy requirements
```

#### For Chat Responses (If needed)
```
Model: gpt-4o-mini
Cost: $0.150 per 1M input tokens, $0.600 per 1M output tokens
Best for: Chat responses, email analysis
```

### 5. Rate Limits Configuration

#### Default Limits (Tier 1)
```
text-embedding-3-small:
- 3,000 requests per minute (RPM)  
- 1,000,000 tokens per minute (TPM)
- $100 per month usage

This allows: ~3,000 emails per minute processing
```

#### If You Need Higher Limits
1. **Increase usage** to reach higher tiers
2. **Contact OpenAI** for enterprise limits
3. **Monitor usage** in dashboard

### 6. Usage Monitoring Setup

#### Cost Tracking
1. **Dashboard → Usage**
2. Set up daily/weekly email alerts
3. Monitor cost per 1K tokens

#### Recommended Alerts
```bash
Daily usage alert: $5
Weekly usage alert: $25  
Monthly hard limit: $100
```

#### Key Metrics to Monitor
- **Cost per email**: Should be ~$0.0001
- **API errors**: Should be <1%
- **Rate limit hits**: Should be 0
- **Average response time**: <2 seconds

### 7. Environment Configuration

#### Vercel Environment Variables
```bash
OPENAI_API_KEY=sk-proj-your_production_key_here
OPENAI_MAX_TOKENS=2000
OPENAI_MODEL=text-embedding-3-small
```

#### Application Configuration
```typescript
// In your app config
export const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small',
  maxTokens: 2000,
  timeout: 30000, // 30 seconds
  retries: 3
};
```

### 8. Cost Estimation & Budgeting

#### Typical Usage Scenarios

**Small User Base (100 users, 1000 emails/month each)**
```
Monthly emails: 100,000
Embedding cost: 100,000 × $0.0001 = $10/month
Total with buffer: ~$15/month
```

**Medium User Base (500 users, 2000 emails/month each)**
```
Monthly emails: 1,000,000  
Embedding cost: 1,000,000 × $0.0001 = $100/month
Total with buffer: ~$150/month
```

**Large User Base (2000 users, 3000 emails/month each)**
```
Monthly emails: 6,000,000
Embedding cost: 6,000,000 × $0.0001 = $600/month
Total with buffer: ~$800/month
```

### 9. Security Best Practices

#### API Key Management
- ✅ Never commit API keys to code
- ✅ Use environment variables only
- ✅ Rotate keys every 90 days
- ✅ Use different keys for dev/staging/prod

#### Rate Limiting Protection
```typescript
// Implement exponential backoff
const retryRequest = async (fn: Function, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) { // Rate limited
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
        continue;
      }
      throw error;
    }
  }
};
```

### 10. Testing & Validation

#### Test API Connection
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-proj-your_key" \
  -H "Content-Type: application/json"
```

#### Test Embedding Generation
```bash
curl https://api.openai.com/v1/embeddings \
  -H "Authorization: Bearer sk-proj-your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Test email content",
    "model": "text-embedding-3-small"
  }'
```

#### Verify Response Format
Expected response:
```json
{
  "object": "list",
  "data": [{
    "object": "embedding", 
    "embedding": [0.123, -0.456, ...], // 1536 dimensions
    "index": 0
  }],
  "model": "text-embedding-3-small",  
  "usage": {
    "prompt_tokens": 4,
    "total_tokens": 4
  }
}
```

### 11. Production Readiness Checklist

- [ ] ✅ OpenAI account created and verified
- [ ] ✅ Billing set up with usage limits
- [ ] ✅ Production API key generated
- [ ] ✅ Environment variables configured in Vercel
- [ ] ✅ Rate limiting implemented in code
- [ ] ✅ Error handling and retries implemented
- [ ] ✅ Usage monitoring and alerts set up
- [ ] ✅ Cost budgeting and limits configured
- [ ] ✅ API connection tested successfully
- [ ] ✅ Embedding generation verified

### 12. Monitoring Dashboard

Create a simple monitoring script:

```typescript
// Check OpenAI usage and costs
export async function checkOpenAIUsage() {
  const response = await fetch('https://api.openai.com/v1/usage', {
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
  });
  
  const data = await response.json();
  
  return {
    currentUsage: data.total_usage,
    dailyLimit: 100 * 100, // $100 in cents
    remainingBudget: (100 * 100) - data.total_usage,
    utilizationPercent: (data.total_usage / (100 * 100)) * 100
  };
}
```

### 13. Troubleshooting

#### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `invalid_api_key` | Wrong/expired key | Regenerate API key |
| `insufficient_quota` | Over rate limits | Implement backoff, upgrade tier |
| `model_not_found` | Wrong model name | Use `text-embedding-3-small` |
| `timeout` | Slow response | Increase timeout, add retries |

#### Debug API Calls
```typescript
// Add comprehensive logging
console.log('OpenAI Request:', {
  model: 'text-embedding-3-small',
  input: input.substring(0, 100) + '...',
  timestamp: new Date().toISOString()
});
```

### 14. Next Steps

After OpenAI setup:
1. ✅ Test embedding generation with real emails
2. ✅ Monitor initial costs and usage patterns  
3. ✅ Set up automated usage reports
4. ✅ Optimize embedding batch sizes
5. ✅ Implement cost-saving measures (deduplication)

## 🆘 Support

- **OpenAI Help**: [OpenAI Help Center](https://help.openai.com/)
- **API Documentation**: [OpenAI API Docs](https://platform.openai.com/docs/)
- **Rate Limits**: [OpenAI Rate Limits Guide](https://platform.openai.com/docs/guides/rate-limits)

---

**✅ Success Criteria**: API key works → Embeddings generate successfully → Costs stay within budget → No rate limit errors