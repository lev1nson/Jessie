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

## **Окружения (Environments)**

| Окружение | URL (Пример) | Назначение |
| :---- | :---- | :---- |
| **Development** | http://localhost:3000 | Локальная разработка и тестирование. |
| **Staging/Preview** | jessie-pr-123.vercel.app | Ревью и тесты для каждого Pull Request. |
| **Production** | jessie.vercel.app | "Живое" приложение. | 