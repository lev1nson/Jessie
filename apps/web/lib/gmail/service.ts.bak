import { GmailClient, GmailCredentials } from './client';
import { AttachmentInfo } from '@jessie/lib';

export interface ParsedEmail {
  google_message_id: string;
  thread_id: string;
  subject: string;
  sender: string;
  recipient: string;
  body_text: string;
  body_html: string;
  date_sent: string;
  has_attachments: boolean;
  attachments?: AttachmentInfo[];
}

export class GmailService {
  private client: GmailClient;

  constructor() {
    this.client = new GmailClient();
  }

  /**
   * Инициализирует сервис с учетными данными пользователя
   */
  async initialize(credentials: GmailCredentials): Promise<void> {
    this.client.setCredentials(credentials);
    
    // Проверяем валидность токенов
    const isValid = await this.client.validateCredentials();
    if (!isValid) {
      // Пытаемся обновить токен
      const newCredentials = await this.client.refreshAccessToken();
      this.client.setCredentials(newCredentials);
    }
  }

  /**
   * Получает новые письма из указанных папок после определенной даты
   */
  async fetchNewEmails(
    afterDate: Date,
    folders: string[] = ['INBOX', 'SENT']
  ): Promise<ParsedEmail[]> {
    const allEmails: ParsedEmail[] = [];

    for (const folder of folders) {
      try {
        const messages = await this.client.getMessagesAfter(
          afterDate,
          [folder],
          100
        );

        for (const message of messages) {
          try {
            const fullMessage = await this.client.getMessage(message.id);
            const parsedEmail = this.parseGmailMessage(fullMessage);
            allEmails.push(parsedEmail);
          } catch (error) {
            console.error(`Failed to fetch message ${message.id}:`, error);
            // Продолжаем обработку других сообщений
          }
        }
      } catch (error) {
        console.error(`Failed to fetch emails from folder ${folder}:`, error);
        // Продолжаем обработку других папок
      }
    }

    return allEmails;
  }

  /**
   * Получает все письма с пагинацией
   */
  async fetchAllEmails(
    folders: string[] = ['INBOX', 'SENT'],
    batchSize: number = 50
  ): Promise<ParsedEmail[]> {
    const allEmails: ParsedEmail[] = [];

    for (const folder of folders) {
      let pageToken: string | undefined;
      
      do {
        try {
          const response = await this.client.listMessages(
            [folder],
            batchSize,
            pageToken
          );

          for (const message of response.messages) {
            try {
              const fullMessage = await this.client.getMessage(message.id);
              const parsedEmail = this.parseGmailMessage(fullMessage);
              allEmails.push(parsedEmail);
            } catch (error) {
              console.error(`Failed to fetch message ${message.id}:`, error);
            }
          }

          pageToken = response.nextPageToken;
        } catch (error) {
          console.error(`Failed to fetch emails from folder ${folder}:`, error);
          break;
        }
      } while (pageToken);
    }

    return allEmails;
  }

  /**
   * Парсит сообщение Gmail в наш формат
   */
  private parseGmailMessage(gmailMessage: any): ParsedEmail {
    const headers = gmailMessage.payload?.headers || [];
    const getHeader = (name: string) => 
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    // Извлекаем текст и HTML из payload
    const { bodyText, bodyHtml } = this.extractMessageBody(gmailMessage.payload);
    
    // Извлекаем информацию о вложениях
    const attachments = this.extractAttachmentInfo(gmailMessage);

    return {
      google_message_id: gmailMessage.id,
      thread_id: gmailMessage.threadId,
      subject: getHeader('Subject'),
      sender: getHeader('From'),
      recipient: getHeader('To'),
      body_text: bodyText,
      body_html: bodyHtml,
      date_sent: new Date(parseInt(gmailMessage.internalDate)).toISOString(),
      has_attachments: this.hasAttachments(gmailMessage.payload),
      attachments,
    };
  }

  /**
   * Извлекает текст и HTML из payload сообщения
   */
  private extractMessageBody(payload: any): { bodyText: string; bodyHtml: string } {
    let bodyText = '';
    let bodyHtml = '';

    if (payload.body?.data) {
      // Простое сообщение
      const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      if (payload.mimeType === 'text/html') {
        bodyHtml = decoded;
      } else {
        bodyText = decoded;
      }
    } else if (payload.parts) {
      // Многочастное сообщение
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }
    }

    return { bodyText, bodyHtml };
  }

  /**
   * Проверяет наличие вложений в сообщении
   */
  private hasAttachments(payload: any): boolean {
    if (payload.parts) {
      return payload.parts.some((part: any) => 
        part.filename && part.filename.length > 0
      );
    }
    return false;
  }

  /**
   * Извлекает информацию о вложениях из сообщения
   */
  private extractAttachmentInfo(gmailMessage: any): AttachmentInfo[] {
    const attachments: AttachmentInfo[] = [];
    
    const extractFromParts = (parts: any[], messageId: string) => {
      for (const part of parts) {
        if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
          attachments.push({
            id: `${messageId}_${part.body.attachmentId}`,
            email_id: messageId, // Will be updated when saving to database
            filename: part.filename,
            mime_type: part.mimeType || 'application/octet-stream',
            size: part.body.size || 0,
            google_attachment_id: part.body.attachmentId,
            created_at: new Date().toISOString(),
          });
        }
        
        // Рекурсивно обрабатываем nested parts
        if (part.parts) {
          extractFromParts(part.parts, messageId);
        }
      }
    };

    if (gmailMessage.payload?.parts) {
      extractFromParts(gmailMessage.payload.parts, gmailMessage.id);
    }

    return attachments;
  }

  /**
   * Получает содержимое вложения по ID
   */
  async fetchAttachmentContent(
    messageId: string, 
    attachmentId: string
  ): Promise<Buffer | null> {
    try {
      const attachment = await this.client.getAttachment(messageId, attachmentId);
      
      if (attachment.data) {
        return Buffer.from(attachment.data, 'base64');
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to fetch attachment ${attachmentId}:`, error);
      return null;
    }
  }

  /**
   * Получает все вложения для сообщения
   */
  async fetchAllAttachments(
    messageId: string, 
    attachmentInfos: AttachmentInfo[]
  ): Promise<Array<{ info: AttachmentInfo; buffer: Buffer | null }>> {
    const results: Array<{ info: AttachmentInfo; buffer: Buffer | null }> = [];

    for (const attachmentInfo of attachmentInfos) {
      const buffer = await this.fetchAttachmentContent(
        messageId, 
        attachmentInfo.google_attachment_id
      );
      
      results.push({
        info: attachmentInfo,
        buffer,
      });
    }

    return results;
  }

  /**
   * Получает поддерживаемые вложения для обработки
   */
  getSupportedAttachments(attachments: AttachmentInfo[]): AttachmentInfo[] {
    const supportedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
      'application/vnd.ms-word.document.macroEnabled.12',
      'application/vnd.ms-word.template.macroEnabled.12',
    ];

    const supportedExtensions = ['.pdf', '.docx', '.dotx', '.docm', '.dotm'];

    return attachments.filter(attachment => {
      const hasSupportedMimeType = supportedMimeTypes.some(type => 
        attachment.mime_type.toLowerCase().includes(type.toLowerCase())
      );
      
      const hasSupportedExtension = supportedExtensions.some(ext => 
        attachment.filename.toLowerCase().endsWith(ext)
      );

      return hasSupportedMimeType || hasSupportedExtension;
    });
  }

  /**
   * Обновляет токены доступа
   */
  async refreshCredentials(): Promise<GmailCredentials> {
    return await this.client.refreshAccessToken();
  }
}