# **Раздел 6: Внешние API**

## **Google Gmail API**

### **Authentication**
- **OAuth 2.0**: Используется для получения доступа к Gmail API
- **Scopes**: `https://www.googleapis.com/auth/gmail.readonly`
- **Token Management**: Access tokens обновляются через refresh tokens

### **Endpoints**

#### **GET /gmail/v1/users/me/messages**
Получение списка писем
- **Query Parameters**:
  - `q` (string): Поисковый запрос (например, "in:inbox", "in:sent")
  - `maxResults` (integer): Максимальное количество результатов (по умолчанию 100)
  - `pageToken` (string): Токен для пагинации
- **Response**: `{ "messages": [...], "nextPageToken": "string" }`

#### **GET /gmail/v1/users/me/messages/{id}**
Получение детальной информации о письме
- **Path Parameters**:
  - `id` (string): ID письма
- **Query Parameters**:
  - `format` (string): "full" для полного содержимого
- **Response**: `{ "id": "string", "threadId": "string", "labelIds": [...], "snippet": "string", "payload": {...} }`

### **Error Handling**
- **Rate Limiting**: 250 requests per user per second
- **Quota Limits**: 1 billion requests per day
- **Retry Strategy**: Exponential backoff for 429, 500, 502, 503, 504 errors
- **Token Expiry**: Refresh tokens valid for 6 months

### **Data Processing**
- **Message Format**: RFC 2822 format
- **Encoding**: UTF-8 for text content
- **Attachments**: Base64 encoded in payload
- **Metadata**: Headers, labels, timestamps

## **LLM Provider API (OpenAI)**

### **Authentication**
- **API Key**: Bearer token authentication
- **Rate Limits**: Varies by model and tier
- **Model Access**: Requires appropriate API tier for embedding models

### **Endpoints**

#### **POST /v1/embeddings**
Создание векторных представлений текста
- **Model**: `text-embedding-3-small` (1536 dimensions) - **UPDATED**
- **Input**: Array of strings (max 8192 tokens per request)
- **Request Body**:
  ```json
  {
    "model": "text-embedding-3-small",
    "input": ["text to embed"],
    "encoding_format": "float"
  }
  ```
- **Response**: 
  ```json
  {
    "data": [
      {
        "embedding": [0.1, 0.2, ...],
        "index": 0,
        "object": "embedding"
      }
    ],
    "model": "text-embedding-3-small",
    "object": "list",
    "usage": {
      "prompt_tokens": 8,
      "total_tokens": 8
    }
  }
  ```

### **Error Handling**
- **Rate Limiting**: 3000 requests per minute for embeddings
- **Token Limits**: 8192 tokens per request
- **Retry Strategy**: Exponential backoff for 429, 500, 502, 503, 504 errors
- **Model Availability**: text-embedding-3-small is the latest and recommended model

### **Vector Processing Specifications**
- **Dimensions**: 1536 for text-embedding-3-small
- **Storage**: pgvector extension in PostgreSQL
- **Index Type**: HNSW (Hierarchical Navigable Small World)
- **Similarity Metric**: Cosine similarity
- **Batch Processing**: Up to 100 embeddings per request for efficiency

### **Text Chunking Strategy**
- **Chunk Size**: 512 tokens per chunk (optimal for embeddings)
- **Overlap**: 50 tokens between chunks for context preservation
- **Max Chunks**: 10 chunks per email to prevent token limit issues
- **Chunk Storage**: JSONB format in text_chunks field

#### **POST /v1/chat/completions**
Генерация ответов на основе контекста
- **Model**: `gpt-4` or `gpt-3.5-turbo`
- **Messages**: Array of message objects
- **Response**: `{ "choices": [{ "message": {...} }] }` 