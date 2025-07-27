import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GmailService } from '../service';
import { GmailClient } from '../client';

// Мокаем Gmail клиент
vi.mock('../client');

describe('GmailService', () => {
  let gmailService: GmailService;
  let mockGmailClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGmailClient = {
      setCredentials: vi.fn(),
      validateCredentials: vi.fn(),
      refreshAccessToken: vi.fn(),
      getMessagesAfter: vi.fn(),
      listMessages: vi.fn(),
      getMessage: vi.fn(),
    };

    (GmailClient as any).mockImplementation(() => mockGmailClient);

    gmailService = new GmailService();
  });

  describe('initialize', () => {
    it('should initialize with valid credentials', async () => {
      const credentials = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
      };

      mockGmailClient.validateCredentials.mockResolvedValue(true);

      await gmailService.initialize(credentials);

      expect(mockGmailClient.setCredentials).toHaveBeenCalledWith(credentials);
      expect(mockGmailClient.validateCredentials).toHaveBeenCalled();
    });

    it('should refresh credentials if validation fails', async () => {
      const credentials = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
      };

      const newCredentials = {
        access_token: 'new-token',
        refresh_token: 'new-refresh',
      };

      mockGmailClient.validateCredentials.mockResolvedValue(false);
      mockGmailClient.refreshAccessToken.mockResolvedValue(newCredentials);

      await gmailService.initialize(credentials);

      expect(mockGmailClient.setCredentials).toHaveBeenCalledTimes(2);
      expect(mockGmailClient.setCredentials).toHaveBeenNthCalledWith(1, credentials);
      expect(mockGmailClient.setCredentials).toHaveBeenNthCalledWith(2, newCredentials);
    });
  });

  describe('fetchNewEmails', () => {
    it('should fetch and parse emails from multiple folders', async () => {
      const afterDate = new Date('2024-01-01');
      const mockMessages = [
        { id: 'msg1', threadId: 'thread1' },
        { id: 'msg2', threadId: 'thread2' },
      ];

      const mockGmailMessage = {
        id: 'msg1',
        threadId: 'thread1',
        internalDate: '1704067200000', // 2024-01-01
        payload: {
          headers: [
            { name: 'Subject', value: 'Test Subject' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'recipient@example.com' },
          ],
          body: {
            data: Buffer.from('Test body').toString('base64'),
          },
          mimeType: 'text/plain',
        },
      };

      mockGmailClient.getMessagesAfter.mockResolvedValue(mockMessages);
      mockGmailClient.getMessage.mockResolvedValue(mockGmailMessage);

      const result = await gmailService.fetchNewEmails(afterDate, ['INBOX']);

      expect(mockGmailClient.getMessagesAfter).toHaveBeenCalledWith(
        afterDate,
        ['INBOX'],
        100
      );
      expect(mockGmailClient.getMessage).toHaveBeenCalledWith('msg1');
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        google_message_id: 'msg1',
        thread_id: 'thread1',
        subject: 'Test Subject',
        sender: 'sender@example.com',
        recipient: 'recipient@example.com',
        body_text: 'Test body',
        has_attachments: false,
      });
    });

    it('should handle errors gracefully and continue processing', async () => {
      const afterDate = new Date('2024-01-01');
      const mockMessages = [
        { id: 'msg1', threadId: 'thread1' },
        { id: 'msg2', threadId: 'thread2' },
      ];

      const mockGmailMessage = {
        id: 'msg2',
        threadId: 'thread2',
        internalDate: '1704067200000',
        payload: {
          headers: [
            { name: 'Subject', value: 'Test Subject 2' },
            { name: 'From', value: 'sender2@example.com' },
            { name: 'To', value: 'recipient2@example.com' },
          ],
          body: {
            data: Buffer.from('Test body 2').toString('base64'),
          },
          mimeType: 'text/plain',
        },
      };

      mockGmailClient.getMessagesAfter.mockResolvedValue(mockMessages);
      mockGmailClient.getMessage
        .mockRejectedValueOnce(new Error('Message not found'))
        .mockResolvedValueOnce(mockGmailMessage);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await gmailService.fetchNewEmails(afterDate, ['INBOX']);

      expect(result).toHaveLength(1);
      expect(result[0].google_message_id).toBe('msg2');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch message msg1:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('parseGmailMessage', () => {
    it('should parse simple text message', () => {
      const gmailMessage = {
        id: 'msg1',
        threadId: 'thread1',
        internalDate: '1704067200000',
        payload: {
          headers: [
            { name: 'Subject', value: 'Test Subject' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'recipient@example.com' },
          ],
          body: {
            data: Buffer.from('Test body').toString('base64'),
          },
          mimeType: 'text/plain',
        },
      };

      // Используем приватный метод через any
      const result = (gmailService as any).parseGmailMessage(gmailMessage);

      expect(result).toEqual({
        google_message_id: 'msg1',
        thread_id: 'thread1',
        subject: 'Test Subject',
        sender: 'sender@example.com',
        recipient: 'recipient@example.com',
        body_text: 'Test body',
        body_html: '',
        date_sent: '2024-01-01T00:00:00.000Z',
        has_attachments: false,
        attachments: [],
      });
    });

    it('should parse multipart message with text and HTML', () => {
      const gmailMessage = {
        id: 'msg1',
        threadId: 'thread1',
        internalDate: '1704067200000',
        payload: {
          headers: [
            { name: 'Subject', value: 'Test Subject' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'recipient@example.com' },
          ],
          parts: [
            {
              mimeType: 'text/plain',
              body: {
                data: Buffer.from('Plain text body').toString('base64'),
              },
            },
            {
              mimeType: 'text/html',
              body: {
                data: Buffer.from('<p>HTML body</p>').toString('base64'),
              },
            },
          ],
        },
      };

      const result = (gmailService as any).parseGmailMessage(gmailMessage);

      expect(result.body_text).toBe('Plain text body');
      expect(result.body_html).toBe('<p>HTML body</p>');
    });

    it('should detect attachments', () => {
      const gmailMessage = {
        id: 'msg1',
        threadId: 'thread1',
        internalDate: '1704067200000',
        payload: {
          headers: [
            { name: 'Subject', value: 'Test Subject' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'recipient@example.com' },
          ],
          parts: [
            {
              mimeType: 'text/plain',
              body: {
                data: Buffer.from('Text with attachment').toString('base64'),
              },
            },
            {
              mimeType: 'application/pdf',
              filename: 'document.pdf',
              body: {
                attachmentId: 'attachment123',
              },
            },
          ],
        },
      };

      const result = (gmailService as any).parseGmailMessage(gmailMessage);

      expect(result.has_attachments).toBe(true);
    });
  });

  describe('refreshCredentials', () => {
    it('should refresh credentials successfully', async () => {
      const newCredentials = {
        access_token: 'new-token',
        refresh_token: 'new-refresh',
      };

      mockGmailClient.refreshAccessToken.mockResolvedValue(newCredentials);

      const result = await gmailService.refreshCredentials();

      expect(result).toEqual(newCredentials);
      expect(mockGmailClient.refreshAccessToken).toHaveBeenCalled();
    });
  });
});