# **Раздел 3: Модели данных**

## **Core Data Models**

*(Определены TypeScript-интерфейсы и SQL-схема для users, chats, messages, emails, participants, email_participants)*

## **Content Processing Models**

### **Email Filtering Configuration**
```typescript
interface FilterConfig {
  id: string;
  userId: string;
  domainPattern: string;
  filterType: 'blacklist' | 'whitelist';
  createdAt: Date;
}

interface EmailFilterResult {
  isFiltered: boolean;
  filterReason?: string;
  processedAt: Date;
}
```

### **Content Extraction Models**
```typescript
interface ContentExtractor {
  extractText(html: string): string;
  extractAttachments(message: GmailMessage): Attachment[];
  validateFileType(mimeType: string): boolean;
}

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  content: Buffer;
}
```

### **Supported File Types**
- **PDF**: application/pdf
- **DOCX**: application/vnd.openxmlformats-officedocument.wordprocessingml.document
- **Maximum File Size**: 10MB per attachment

### **Content Processing Pipeline**
1. **Email Filtering**: Apply domain and content filters
2. **Text Extraction**: Parse HTML and extract plain text
3. **Attachment Processing**: Detect and validate attachments
4. **Content Storage**: Store processed content in database 