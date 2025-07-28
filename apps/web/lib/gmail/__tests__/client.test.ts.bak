import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GmailClient } from '../client';

// Mock googleapis
const mockOAuth2Client = {
  setCredentials: vi.fn(),
  refreshAccessToken: vi.fn(),
};

const mockGmail = {
  users: {
    messages: {
      list: vi.fn(),
      get: vi.fn(),
    },
    getProfile: vi.fn(),
  },
};

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(() => mockOAuth2Client),
    },
    gmail: vi.fn(() => mockGmail),
  },
}));

describe('GmailClient', () => {
  let gmailClient: GmailClient;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock environment variables
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-client-secret');
    vi.stubEnv('GOOGLE_REDIRECT_URI', 'test-redirect-uri');

    gmailClient = new GmailClient();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('setCredentials', () => {
    it('should set credentials on OAuth2 client', () => {
      const credentials = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: 1234567890,
      };

      gmailClient.setCredentials(credentials);

      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: 1234567890,
      });
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      const mockCredentials = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expiry_date: 1234567890,
      };

      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: mockCredentials,
      });

      const result = await gmailClient.refreshAccessToken();

      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expiry_date: 1234567890,
      });
    });

    it('should handle refresh token error', async () => {
      mockOAuth2Client.refreshAccessToken.mockRejectedValue(
        new Error('Invalid refresh token')
      );

      await expect(gmailClient.refreshAccessToken()).rejects.toThrow(
        'Failed to refresh access token: Error: Invalid refresh token'
      );
    });
  });

  describe('listMessages', () => {
    it('should list messages successfully', async () => {
      const mockResponse = {
        data: {
          messages: [
            { id: 'msg1', threadId: 'thread1' },
            { id: 'msg2', threadId: 'thread2' },
          ],
          nextPageToken: 'next-page-token',
        },
      };

      mockGmail.users.messages.list.mockResolvedValue(mockResponse);

      const result = await gmailClient.listMessages(['INBOX'], 10, 'page-token');

      expect(mockGmail.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        labelIds: ['INBOX'],
        maxResults: 10,
        pageToken: 'page-token',
      });

      expect(result).toEqual({
        messages: [
          { id: 'msg1', threadId: 'thread1' },
          { id: 'msg2', threadId: 'thread2' },
        ],
        nextPageToken: 'next-page-token',
      });
    });

    it('should handle empty messages response', async () => {
      const mockResponse = {
        data: {},
      };

      mockGmail.users.messages.list.mockResolvedValue(mockResponse);

      const result = await gmailClient.listMessages();

      expect(result).toEqual({
        messages: [],
        nextPageToken: undefined,
      });
    });

    it('should handle list messages error', async () => {
      mockGmail.users.messages.list.mockRejectedValue(
        new Error('API Error')
      );

      await expect(gmailClient.listMessages()).rejects.toThrow(
        'Failed to list messages: Error: API Error'
      );
    });
  });

  describe('getMessage', () => {
    it('should get message successfully', async () => {
      const mockMessage = {
        data: {
          id: 'msg1',
          threadId: 'thread1',
          payload: {
            headers: [
              { name: 'Subject', value: 'Test Subject' },
            ],
          },
        },
      };

      mockGmail.users.messages.get.mockResolvedValue(mockMessage);

      const result = await gmailClient.getMessage('msg1');

      expect(mockGmail.users.messages.get).toHaveBeenCalledWith({
        userId: 'me',
        id: 'msg1',
        format: 'full',
      });

      expect(result).toEqual(mockMessage.data);
    });

    it('should handle get message error', async () => {
      mockGmail.users.messages.get.mockRejectedValue(
        new Error('Message not found')
      );

      await expect(gmailClient.getMessage('msg1')).rejects.toThrow(
        'Failed to get message msg1: Error: Message not found'
      );
    });
  });

  describe('getMessagesAfter', () => {
    it('should get messages after date successfully', async () => {
      const afterDate = new Date('2024-01-01');
      const mockResponse = {
        data: {
          messages: [
            { id: 'msg1', threadId: 'thread1' },
          ],
        },
      };

      mockGmail.users.messages.list.mockResolvedValue(mockResponse);

      const result = await gmailClient.getMessagesAfter(afterDate, ['INBOX'], 50);

      expect(mockGmail.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        labelIds: ['INBOX'],
        maxResults: 50,
        q: `after:${Math.floor(afterDate.getTime() / 1000)}`,
      });

      expect(result).toEqual([{ id: 'msg1', threadId: 'thread1' }]);
    });
  });

  describe('validateCredentials', () => {
    it('should return true for valid credentials', async () => {
      mockGmail.users.getProfile.mockResolvedValue({
        data: { emailAddress: 'test@example.com' },
      });

      const result = await gmailClient.validateCredentials();

      expect(result).toBe(true);
      expect(mockGmail.users.getProfile).toHaveBeenCalledWith({
        userId: 'me',
      });
    });

    it('should return false for invalid credentials', async () => {
      mockGmail.users.getProfile.mockRejectedValue(
        new Error('Invalid credentials')
      );

      const result = await gmailClient.validateCredentials();

      expect(result).toBe(false);
    });
  });
});