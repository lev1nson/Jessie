# **Раздел 4: Спецификация API (OpenAPI 3.0)**

## **Authentication Endpoints**

### **POST /api/auth/google/login**
Initiates Google OAuth 2.0 flow
- **Response**: Redirects to Google OAuth consent screen
- **Headers**: None required
- **Body**: None required

### **GET /api/auth/google/callback**
Handles Google OAuth 2.0 callback
- **Query Parameters**: 
  - `code` (string): Authorization code from Google
  - `state` (string): CSRF protection token
- **Response**: 
  - Success: Redirect to `/chat` with session established
  - Error: Redirect to `/auth/login` with error message
- **Headers**: None required

### **POST /api/auth/logout**
Terminates user session
- **Response**: Redirects to `/auth/login`
- **Headers**: Authorization token required
- **Body**: None required

## **Chat Endpoints**

### **POST /chats**
Создать новый чат
- **Headers**: Authorization token required
- **Body**: `{ "title": "string" }`
- **Response**: `{ "id": "uuid", "title": "string", "created_at": "timestamp" }`

### **GET /chats**
Получить список чатов
- **Headers**: Authorization token required
- **Response**: `[{ "id": "uuid", "title": "string", "created_at": "timestamp" }]`

### **GET /chats/{chatId}/messages**
Получить сообщения чата
- **Headers**: Authorization token required
- **Response**: `[{ "id": "uuid", "role": "user|assistant", "content": "string", "created_at": "timestamp" }]`

### **POST /chats/{chatId}/messages**
Отправить новое сообщение
- **Headers**: Authorization token required
- **Body**: `{ "content": "string" }`
- **Response**: `{ "id": "uuid", "role": "assistant", "content": "string", "created_at": "timestamp" }`

### **POST /api/chat/messages**
Отправка нового сообщения с векторным поиском
- **Headers**: Authorization token required
- **Body**: `{ "chatId": "string", "content": "string" }`
- **Response**: `{ "message": "Message", "sources": "Email[]" }`
- **Rate Limiting**: 20 requests per minute per user
- **Security**: Input validation, XSS prevention

### **POST /api/search/vector**
Векторный поиск по запросу
- **Headers**: Authorization token required
- **Body**: `{ "query": "string", "limit": "number (optional, default: 10)" }`
- **Response**: `{ "results": "Email[]", "scores": "number[]" }`
- **Rate Limiting**: 30 requests per minute per user
- **Security**: Query sanitization, user data isolation

## **Analysis Endpoints**

### **POST /api/analysis/participants**
Анализ участников по теме
- **Headers**: Authorization token required
- **Body**: `{ "topic": "string", "limit": "number (optional, default: 50)" }`
- **Response**: `{ "participants": "Participant[]", "totalEmails": "number", "processingTime": "number" }`
- **Rate Limiting**: 10 requests per minute per user
- **Security**: Only returns participants from user's own emails

### **GET /api/analysis/participants/{emailId}**
Получение участников конкретного письма
- **Headers**: Authorization token required
- **Response**: `{ "participants": "Participant[]" }`
- **Security**: Only returns participants if user owns the email

### **POST /api/analysis/temporal**
Временной анализ по теме
- **Headers**: Authorization token required
- **Body**: `{ 
  "query": "string", 
  "dateFrom": "string (optional)", 
  "dateTo": "string (optional)", 
  "timeRange": "day|week|month|year (optional)",
  "limit": "number (optional, default: 50)" 
}`
- **Response**: `{ 
  "events": "TemporalEvent[]", 
  "timeline": "TimelineGroup[]", 
  "summary": "string",
  "processingTime": "number" 
}`
- **Rate Limiting**: 15 requests per minute per user
- **Security**: Query sanitization, user data isolation

### **GET /api/analysis/timeline/{query}**
Получение временной шкалы по запросу
- **Headers**: Authorization token required
- **Response**: `{ "timeline": "TimelineEvent[]" }`
- **Rate Limiting**: 20 requests per minute per user
- **Security**: User data isolation

### **POST /api/analysis/comprehensive**
Комплексный анализ по теме
- **Headers**: Authorization token required
- **Body**: `{ 
  "query": "string", 
  "context": "string (optional)",
  "includeParticipants": "boolean (optional)",
  "includeTimeline": "boolean (optional)",
  "maxResults": "number (optional, default: 100)" 
}`
- **Response**: `{ 
  "report": "string",
  "participants": "Participant[] (optional)",
  "timeline": "TimelineEvent[] (optional)",
  "sources": "Email[]",
  "processingTime": "number",
  "confidence": "number"
}`
- **Rate Limiting**: 10 requests per minute per user
- **Security**: Query sanitization, user data isolation

### **POST /api/analysis/export**
Экспорт отчета
- **Headers**: Authorization token required
- **Body**: `{ "reportId": "string", "format": "markdown|json" }`
- **Response**: `{ "downloadUrl": "string" }`
- **Rate Limiting**: 5 requests per minute per user
- **Security**: User data isolation

### **Types**
```typescript
interface Participant {
  id: string;
  email: string;
  name?: string;
  role: 'from' | 'to' | 'cc';
  frequency: number;
  domain: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source_email_ids?: string[];
  created_at: string;
}

interface Email {
  id: string;
  subject?: string;
  body_text: string;
  sent_at?: string;
  metadata?: Record<string, any>;
}

interface TemporalEvent {
  id: string;
  email_id: string;
  date: string;
  subject?: string;
  summary: string;
  relevance_score: number;
}

interface TimelineGroup {
  period: string;
  events: TemporalEvent[];
  summary: string;
}

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'email' | 'milestone' | 'summary';
}

interface ComprehensiveAnalysis {
  report: string;
  participants?: Participant[];
  timeline?: TimelineEvent[];
  sources: Email[];
  processingTime: number;
  confidence: number;
}

interface ExportRequest {
  reportId: string;
  format: 'markdown' | 'json';
}
``` 