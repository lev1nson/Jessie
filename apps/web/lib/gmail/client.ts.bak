import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface GmailCredentials {
  access_token: string;
  refresh_token: string;
  expiry_date?: number;
}

export class GmailClient {
  private oauth2Client: OAuth2Client;
  private gmail: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.GOOGLE_REDIRECT_URI!
    );

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Устанавливает учетные данные для OAuth2 клиента
   */
  setCredentials(credentials: GmailCredentials): void {
    this.oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expiry_date: credentials.expiry_date,
    });
  }

  /**
   * Обновляет access token используя refresh token
   */
  async refreshAccessToken(): Promise<GmailCredentials> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      return {
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token!,
        expiry_date: credentials.expiry_date || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to refresh access token: ${error}`);
    }
  }

  /**
   * Получает список сообщений из указанной папки
   */
  async listMessages(
    labelIds: string[] = ['INBOX'],
    maxResults: number = 100,
    pageToken?: string
  ): Promise<{
    messages: Array<{ id: string; threadId: string }>;
    nextPageToken?: string;
  }> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        labelIds,
        maxResults,
        pageToken,
      });

      return {
        messages: response.data.messages || [],
        nextPageToken: response.data.nextPageToken,
      };
    } catch (error) {
      throw new Error(`Failed to list messages: ${error}`);
    }
  }

  /**
   * Получает полную информацию о сообщении
   */
  async getMessage(messageId: string): Promise<any> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to get message ${messageId}: ${error}`);
    }
  }

  /**
   * Получает сообщения, созданные после указанной даты
   */
  async getMessagesAfter(
    afterDate: Date,
    labelIds: string[] = ['INBOX'],
    maxResults: number = 100
  ): Promise<Array<{ id: string; threadId: string }>> {
    try {
      const query = `after:${Math.floor(afterDate.getTime() / 1000)}`;
      
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        labelIds,
        maxResults,
        q: query,
      });

      return response.data.messages || [];
    } catch (error) {
      throw new Error(`Failed to get messages after ${afterDate}: ${error}`);
    }
  }

  /**
   * Получает вложение по ID сообщения и ID вложения
   */
  async getAttachment(messageId: string, attachmentId: string): Promise<any> {
    try {
      const response = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to get attachment ${attachmentId} from message ${messageId}: ${error}`);
    }
  }

  /**
   * Проверяет валидность текущих учетных данных
   */
  async validateCredentials(): Promise<boolean> {
    try {
      await this.gmail.users.getProfile({ userId: 'me' });
      return true;
    } catch {
      return false;
    }
  }
}