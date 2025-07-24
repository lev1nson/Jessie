# **Раздел 12: Архитектура развертывания**

## **Стратегия развертывания (Deployment Strategy)**

Мы будем использовать **Git-flow** — развертывание происходит автоматически на основе действий в Git-репозитории. Frontend и Backend развертываются одновременно через Vercel.

## **CI/CD Пайплайн (CI/CD Pipeline)**

Процесс полностью управляется Vercel:

1. **Push в ветку**: Vercel автоматически создает "Preview-развертывание".  
2. **Создание Pull Request в main**: На Preview-развертывании запускаются тесты.  
3. **Слияние с main**: Vercel автоматически собирает и развертывает продакшен-версию.  
```yaml
# Пример CI/CD пайплайна  
- on: push(branch: feature-branch)  
  action: Deploy to Preview URL  
- on: pull_request(to: main)  
  action: Run Tests on Preview URL  
- on: merge(branch: main)  
  action: Deploy to Production
```

## **Vercel Cron Jobs**

### **Email Sync Cron Job**
```typescript
// apps/web/app/api/cron/email-sync/route.ts
export async function GET(request: Request) {
  // Cron job runs every hour
  // Vercel cron syntax: "0 * * * *"
  
  try {
    // 1. Get all users with valid tokens
    // 2. For each user, sync emails from Gmail
    // 3. Store in Supabase
    // 4. Log results
    
    return new Response('Email sync completed', { status: 200 });
  } catch (error) {
    console.error('Email sync failed:', error);
    return new Response('Email sync failed', { status: 500 });
  }
}
```

### **Cron Job Configuration**
```json
{
  "crons": [
    {
      "path": "/api/cron/email-sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

### **Monitoring & Alerts**
- **Success Metrics**: Number of emails synced per run
- **Error Alerts**: Failed sync attempts via Vercel Log Drains
- **Performance**: Sync duration and API quota usage
- **Retry Logic**: Automatic retry for transient failures

## **Окружения (Environments)**

| Окружение | URL (Пример) | Назначение |
| :---- | :---- | :---- |
| **Development** | http://localhost:3000 | Локальная разработка и тестирование. |
| **Staging/Preview** | jessie-pr-123.vercel.app | Ревью и тесты для каждого Pull Request. |
| **Production** | jessie.vercel.app | "Живое" приложение. | 