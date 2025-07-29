import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the @jessie/lib module
vi.mock('@jessie/lib', () => ({
  createServiceSupabase: vi.fn(),
}));

import { EmailRepository } from '../emailRepository';

// Create a proper mock for Supabase client with method chaining
const createMockSupabaseClient = () => {
  const mockClient = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    single: vi.fn(),
    count: vi.fn(),
  };

  // Set up method chaining
  mockClient.from.mockReturnValue(mockClient);
  mockClient.select.mockReturnValue(mockClient);
  mockClient.insert.mockReturnValue(mockClient);
  mockClient.eq.mockReturnValue(mockClient);
  mockClient.in.mockReturnValue(mockClient);
  mockClient.order.mockReturnValue(mockClient);
  mockClient.limit.mockReturnValue(mockClient);
  mockClient.range.mockReturnValue(mockClient);
  mockClient.count.mockReturnValue(mockClient);

  return mockClient;
};

describe('EmailRepository', () => {
  let emailRepository: EmailRepository;
  let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    mockSupabaseClient = createMockSupabaseClient();
    
    // Get the mocked function and set its return value
    const { createServiceSupabase } = await import('@jessie/lib');
    vi.mocked(createServiceSupabase).mockReturnValue(mockSupabaseClient as any);
    
    emailRepository = new EmailRepository();
  });

  describe('saveEmail', () => {
    it('should save email successfully', async () => {
      const email = {
        google_message_id: 'msg123',
        thread_id: 'thread123',
        subject: 'Test Subject',
        sender: 'sender@example.com',
        recipient: 'recipient@example.com',
        body_text: 'Test body',
        body_html: '<p>Test body</p>',
        date_sent: '2024-01-01T00:00:00.000Z',
        has_attachments: false,
      };

      const mockResult = { id: 1, ...email, user_id: 'user123' };
      mockSupabaseClient.single.mockResolvedValue({
        data: mockResult,
        error: null,
      });

      const result = await emailRepository.saveEmail('user123', email);

      expect(result).toEqual(mockResult);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('emails');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        user_id: 'user123',
        google_message_id: 'msg123',
        thread_id: 'thread123',
        subject: 'Test Subject',
        sender: 'sender@example.com',
        recipient: 'recipient@example.com',
        body_text: 'Test body',
        body_html: '<p>Test body</p>',
        date_sent: '2024-01-01T00:00:00.000Z',
        has_attachments: false,
      });
      expect(mockSupabaseClient.select).toHaveBeenCalled();
      expect(mockSupabaseClient.single).toHaveBeenCalled();
    });

    it('should return null if save fails', async () => {
      const email = {
        google_message_id: 'msg123',
        thread_id: 'thread123',
        subject: 'Test Subject',
        sender: 'sender@example.com',
        recipient: 'recipient@example.com',
        body_text: 'Test body',
        body_html: '<p>Test body</p>',
        date_sent: '2024-01-01T00:00:00.000Z',
        has_attachments: false,
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await emailRepository.saveEmail('user123', email);

      expect(result).toBeNull();
    });
  });

  describe('saveEmailsBatch', () => {
    it('should save multiple emails successfully', async () => {
      const emails = [
        {
          google_message_id: 'msg1',
          thread_id: 'thread1',
          subject: 'Subject 1',
          sender: 'sender1@example.com',
          recipient: 'recipient@example.com',
          body_text: 'Body 1',
          body_html: '<p>Body 1</p>',
          date_sent: '2024-01-01T00:00:00.000Z',
          has_attachments: false,
        },
        {
          google_message_id: 'msg2',
          thread_id: 'thread2',
          subject: 'Subject 2',
          sender: 'sender2@example.com',
          recipient: 'recipient@example.com',
          body_text: 'Body 2',
          body_html: '<p>Body 2</p>',
          date_sent: '2024-01-01T01:00:00.000Z',
          has_attachments: true,
        },
      ];

      const mockResult = emails.map((email, index) => ({
        id: index + 1,
        user_id: 'user123',
        ...email,
      }));

      mockSupabaseClient.select.mockResolvedValue({
        data: mockResult,
        error: null,
      });

      const result = await emailRepository.saveEmailsBatch('user123', emails);

      expect(result).toEqual(mockResult);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('emails');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([
        {
          user_id: 'user123',
          google_message_id: 'msg1',
          thread_id: 'thread1',
          subject: 'Subject 1',
          sender: 'sender1@example.com',
          recipient: 'recipient@example.com',
          body_text: 'Body 1',
          body_html: '<p>Body 1</p>',
          date_sent: '2024-01-01T00:00:00.000Z',
          has_attachments: false,
          is_filtered: false,
          filter_reason: null,
          processed_at: null,
        },
        {
          user_id: 'user123',
          google_message_id: 'msg2',
          thread_id: 'thread2',
          subject: 'Subject 2',
          sender: 'sender2@example.com',
          recipient: 'recipient@example.com',
          body_text: 'Body 2',
          body_html: '<p>Body 2</p>',
          date_sent: '2024-01-01T01:00:00.000Z',
          has_attachments: true,
          is_filtered: false,
          filter_reason: null,
          processed_at: null,
        },
      ]);
      expect(mockSupabaseClient.select).toHaveBeenCalled();
    });

    it('should return empty array for empty input', async () => {
      const result = await emailRepository.saveEmailsBatch('user123', []);
      expect(result).toEqual([]);
    });
  });

  describe('emailExists', () => {
    it('should return true if email exists', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: 1 },
        error: null,
      });

      const result = await emailRepository.emailExists('msg123');

      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('emails');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('id');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('google_message_id', 'msg123');
      expect(mockSupabaseClient.single).toHaveBeenCalled();
    });

    it('should return false if email does not exist', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // No rows returned
      });

      const result = await emailRepository.emailExists('msg123');

      expect(result).toBe(false);
    });

    it('should return false for database errors', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await emailRepository.emailExists('msg123');

      expect(result).toBe(false);
    });
  });

  describe('getLastEmailDate', () => {
    it('should return last email date', async () => {
      const mockDate = '2024-01-01T00:00:00.000Z';
      mockSupabaseClient.single.mockResolvedValue({
        data: { date_sent: mockDate },
        error: null,
      });

      const result = await emailRepository.getLastEmailDate('user123');

      expect(result).toEqual(new Date(mockDate));
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('emails');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('date_sent');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user123');
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('date_sent', { ascending: false });
      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(1);
      expect(mockSupabaseClient.single).toHaveBeenCalled();
    });

    it('should return null if no emails found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await emailRepository.getLastEmailDate('user123');

      expect(result).toBeNull();
    });
  });

  describe('getEmailCount', () => {
    it('should return email count', async () => {
      // Reset all mocks for this test
      vi.clearAllMocks();
      
      // Create a fresh mock client for this test
      const freshMockClient = createMockSupabaseClient();
      
      // Mock the count query response - note that count queries return { count, error } not { data, error }
      freshMockClient.eq.mockResolvedValue({
        count: 5,
        error: null,
      });
      
      // Set up the mocked function to return our fresh client
      const { createServiceSupabase } = await import('@jessie/lib');
      vi.mocked(createServiceSupabase).mockReturnValue(freshMockClient as any);
      
      // Create a new repository instance
      const testRepository = new EmailRepository();

      const result = await testRepository.getEmailCount('user123');

      expect(result).toBe(5);
      expect(freshMockClient.from).toHaveBeenCalledWith('emails');
      expect(freshMockClient.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
      expect(freshMockClient.eq).toHaveBeenCalledWith('user_id', 'user123');
    });

    it('should return 0 for database errors', async () => {
      // Reset the mock to ensure proper method chaining
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockResolvedValue({
        count: null,
        error: { message: 'Database error' },
      });

      const result = await emailRepository.getEmailCount('user123');

      expect(result).toBe(0);
    });
  });

  describe('filterNewEmails', () => {
    it('should filter out existing emails', async () => {
      const emails = [
        {
          google_message_id: 'msg1',
          thread_id: 'thread1',
          subject: 'Subject 1',
          sender: 'sender1@example.com',
          recipient: 'recipient@example.com',
          body_text: 'Body 1',
          body_html: '<p>Body 1</p>',
          date_sent: '2024-01-01T00:00:00.000Z',
          has_attachments: false,
        },
        {
          google_message_id: 'msg2',
          thread_id: 'thread2',
          subject: 'Subject 2',
          sender: 'sender2@example.com',
          recipient: 'recipient@example.com',
          body_text: 'Body 2',
          body_html: '<p>Body 2</p>',
          date_sent: '2024-01-01T01:00:00.000Z',
          has_attachments: true,
        },
        {
          google_message_id: 'msg3',
          thread_id: 'thread3',
          subject: 'Subject 3',
          sender: 'sender3@example.com',
          recipient: 'recipient@example.com',
          body_text: 'Body 3',
          body_html: '<p>Body 3</p>',
          date_sent: '2024-01-01T02:00:00.000Z',
          has_attachments: false,
        },
      ];

      mockSupabaseClient.in.mockResolvedValue({
        data: [{ google_message_id: 'msg2' }],
        error: null,
      });

      const result = await emailRepository.filterNewEmails(emails);

      expect(result).toHaveLength(2);
      expect(result[0].google_message_id).toBe('msg1');
      expect(result[1].google_message_id).toBe('msg3');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('emails');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('google_message_id');
      expect(mockSupabaseClient.in).toHaveBeenCalledWith('google_message_id', ['msg1', 'msg2', 'msg3']);
    });

    it('should return all emails if none exist', async () => {
      const emails = [
        {
          google_message_id: 'msg1',
          thread_id: 'thread1',
          subject: 'Subject 1',
          sender: 'sender1@example.com',
          recipient: 'recipient@example.com',
          body_text: 'Body 1',
          body_html: '<p>Body 1</p>',
          date_sent: '2024-01-01T00:00:00.000Z',
          has_attachments: false,
        },
      ];

      mockSupabaseClient.in.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await emailRepository.filterNewEmails(emails);

      expect(result).toEqual(emails);
    });
  });

  describe('getUserEmails', () => {
    it('should get user emails with pagination', async () => {
      const mockEmails = [
        {
          id: 1,
          subject: 'Email 1',
          date_sent: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          subject: 'Email 2',
          date_sent: '2024-01-01T01:00:00.000Z',
        },
      ];

      mockSupabaseClient.range.mockResolvedValue({
        data: mockEmails,
        error: null,
      });

      const result = await emailRepository.getUserEmails('user123', 10, 0);

      expect(result).toEqual(mockEmails);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('emails');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user123');
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('date_sent', { ascending: false });
      expect(mockSupabaseClient.range).toHaveBeenCalledWith(0, 9);
    });

    it('should return empty array for database errors', async () => {
      mockSupabaseClient.range.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await emailRepository.getUserEmails('user123', 10, 0);

      expect(result).toEqual([]);
    });
  });
});