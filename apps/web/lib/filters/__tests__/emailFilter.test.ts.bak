import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailFilter, FilteredEmail } from '../emailFilter';
import { ParsedEmail } from '../../gmail/service';
import { FilterConfig } from '@jessie/lib';

// Mock the DomainFilter
const mockDomainFilter = {
  filterEmail: vi.fn(),
  checkEmailSize: vi.fn(),
};

vi.mock('../domainFilter', () => ({
  DomainFilter: vi.fn().mockImplementation(() => mockDomainFilter),
}));

describe('EmailFilter', () => {
  let emailFilter: EmailFilter;
  let mockEmail: ParsedEmail;
  let mockFilterConfigs: FilterConfig[];

  beforeEach(() => {
    vi.clearAllMocks();
    emailFilter = new EmailFilter();
    
    mockEmail = {
      google_message_id: 'msg123',
      thread_id: 'thread123',
      subject: 'Test Subject',
      sender: 'sender@example.com',
      recipient: 'recipient@example.com',
      body_text: 'This is the email body text.',
      body_html: '<p>This is the email body text.</p>',
      date_sent: '2024-01-01T00:00:00.000Z',
      has_attachments: false,
    };

    mockFilterConfigs = [
      {
        id: '1',
        user_id: 'user123',
        domain_pattern: 'spam.com',
        filter_type: 'blacklist' as const,
        created_at: '2024-01-01T00:00:00.000Z',
      },
      {
        id: '2',
        user_id: 'user123',
        domain_pattern: 'trusted.com',
        filter_type: 'whitelist' as const,
        created_at: '2024-01-01T00:00:00.000Z',
      },
    ];

    // Setup default mock returns
    mockDomainFilter.filterEmail.mockReturnValue({
      isFiltered: false,
      reason: null,
      confidence: 0,
    });

    mockDomainFilter.checkEmailSize.mockReturnValue({
      isFiltered: false,
      reason: null,
      confidence: 0,
    });
  });

  describe('filterEmail', () => {
    it('should filter email when domain filter triggers', async () => {
      mockDomainFilter.filterEmail.mockReturnValue({
        isFiltered: true,
        reason: 'Blacklisted domain: spam.com',
        confidence: 0.9,
      });

      const result = await emailFilter.filterEmail(mockEmail, mockFilterConfigs);

      expect(result.is_filtered).toBe(true);
      expect(result.filter_reason).toBe('Blacklisted domain: spam.com');
      expect(result.processed_at).toBeDefined();
      expect(new Date(result.processed_at)).toBeInstanceOf(Date);
      
      // Verify custom lists were passed
      expect(mockDomainFilter.filterEmail).toHaveBeenCalledWith(
        'sender@example.com',
        'Test Subject',
        'This is the email body text.',
        ['spam.com'], // custom blacklist
        ['trusted.com'] // custom whitelist
      );
    });

    it('should filter email when size check fails', async () => {
      mockDomainFilter.checkEmailSize.mockReturnValue({
        isFiltered: true,
        reason: 'Email size exceeds limit: 2000000 bytes',
        confidence: 1.0,
      });

      const result = await emailFilter.filterEmail(mockEmail, mockFilterConfigs);

      expect(result.is_filtered).toBe(true);
      expect(result.filter_reason).toBe('Email size exceeds limit: 2000000 bytes');
      expect(mockDomainFilter.checkEmailSize).toHaveBeenCalledWith(
        'This is the email body text.',
        '<p>This is the email body text.</p>'
      );
    });

    it('should not filter email when all checks pass', async () => {
      const result = await emailFilter.filterEmail(mockEmail, mockFilterConfigs);

      expect(result.is_filtered).toBe(false);
      expect(result.filter_reason).toBeNull();
      expect(result.processed_at).toBeDefined();
      
      // Should contain all original email properties
      expect(result.google_message_id).toBe('msg123');
      expect(result.subject).toBe('Test Subject');
      expect(result.sender).toBe('sender@example.com');
    });

    it('should prioritize domain filtering over size filtering', async () => {
      mockDomainFilter.filterEmail.mockReturnValue({
        isFiltered: true,
        reason: 'Domain filter triggered',
        confidence: 0.8,
      });

      mockDomainFilter.checkEmailSize.mockReturnValue({
        isFiltered: true,
        reason: 'Size filter triggered',
        confidence: 1.0,
      });

      const result = await emailFilter.filterEmail(mockEmail, mockFilterConfigs);

      expect(result.is_filtered).toBe(true);
      expect(result.filter_reason).toBe('Domain filter triggered');
    });

    it('should handle empty filter configs', async () => {
      const result = await emailFilter.filterEmail(mockEmail, []);

      expect(mockDomainFilter.filterEmail).toHaveBeenCalledWith(
        'sender@example.com',
        'Test Subject',
        'This is the email body text.',
        [], // empty custom blacklist
        [] // empty custom whitelist
      );
      expect(result.is_filtered).toBe(false);
    });

    it('should handle filtering errors gracefully', async () => {
      mockDomainFilter.filterEmail.mockImplementation(() => {
        throw new Error('Filter error');
      });

      const originalConsoleError = console.error;
      console.error = vi.fn();

      try {
        const result = await emailFilter.filterEmail(mockEmail, mockFilterConfigs);

        expect(result.is_filtered).toBe(false);
        expect(result.filter_reason).toBe('Filter error - not filtered');
        expect(console.error).toHaveBeenCalledWith('Error filtering email:', expect.any(Error));
      } finally {
        console.error = originalConsoleError;
      }
    });

    it('should separate blacklist and whitelist configs correctly', async () => {
      const mixedConfigs: FilterConfig[] = [
        { id: '1', user_id: 'user1', domain_pattern: 'black1.com', filter_type: 'blacklist', created_at: '2024-01-01' },
        { id: '2', user_id: 'user1', domain_pattern: 'white1.com', filter_type: 'whitelist', created_at: '2024-01-01' },
        { id: '3', user_id: 'user1', domain_pattern: 'black2.com', filter_type: 'blacklist', created_at: '2024-01-01' },
        { id: '4', user_id: 'user1', domain_pattern: 'white2.com', filter_type: 'whitelist', created_at: '2024-01-01' },
      ];

      await emailFilter.filterEmail(mockEmail, mixedConfigs);

      expect(mockDomainFilter.filterEmail).toHaveBeenCalledWith(
        'sender@example.com',
        'Test Subject',
        'This is the email body text.',
        ['black1.com', 'black2.com'],
        ['white1.com', 'white2.com']
      );
    });
  });

  describe('filterEmails', () => {
    it('should filter multiple emails', async () => {
      const emails: ParsedEmail[] = [
        { ...mockEmail, google_message_id: 'msg1', sender: 'good@example.com' },
        { ...mockEmail, google_message_id: 'msg2', sender: 'spam@spam.com' },
        { ...mockEmail, google_message_id: 'msg3', sender: 'ok@example.com' },
      ];

      mockDomainFilter.filterEmail.mockImplementation((sender) => {
        if (sender === 'spam@spam.com') {
          return { isFiltered: true, reason: 'Spam domain', confidence: 0.9 };
        }
        return { isFiltered: false, reason: null, confidence: 0 };
      });

      const results = await emailFilter.filterEmails(emails, mockFilterConfigs);

      expect(results).toHaveLength(3);
      expect(results[0].is_filtered).toBe(false);
      expect(results[1].is_filtered).toBe(true);
      expect(results[1].filter_reason).toBe('Spam domain');
      expect(results[2].is_filtered).toBe(false);
    });

    it('should handle empty email list', async () => {
      const results = await emailFilter.filterEmails([], mockFilterConfigs);
      expect(results).toEqual([]);
    });

    it('should process each email independently', async () => {
      const emails: ParsedEmail[] = [
        { ...mockEmail, google_message_id: 'msg1' },
        { ...mockEmail, google_message_id: 'msg2' },
      ];

      mockDomainFilter.filterEmail.mockReturnValueOnce({
        isFiltered: false,
        reason: null,
        confidence: 0,
      }).mockReturnValueOnce({
        isFiltered: true,
        reason: 'Filtered',
        confidence: 0.8,
      });

      const results = await emailFilter.filterEmails(emails, mockFilterConfigs);

      expect(results[0].is_filtered).toBe(false);
      expect(results[1].is_filtered).toBe(true);
      expect(mockDomainFilter.filterEmail).toHaveBeenCalledTimes(2);
    });
  });

  describe('getFilteringStats', () => {
    it('should calculate filtering statistics correctly', () => {
      const filteredEmails: FilteredEmail[] = [
        { ...mockEmail, is_filtered: false, filter_reason: null, processed_at: '2024-01-01' },
        { ...mockEmail, is_filtered: true, filter_reason: 'Spam domain', processed_at: '2024-01-01' },
        { ...mockEmail, is_filtered: true, filter_reason: 'Marketing email', processed_at: '2024-01-01' },
        { ...mockEmail, is_filtered: true, filter_reason: 'Spam domain', processed_at: '2024-01-01' },
        { ...mockEmail, is_filtered: false, filter_reason: null, processed_at: '2024-01-01' },
      ];

      const stats = emailFilter.getFilteringStats(filteredEmails);

      expect(stats.total).toBe(5);
      expect(stats.filtered).toBe(3);
      expect(stats.kept).toBe(2);
      expect(stats.filterRate).toBe(60); // 3/5 * 100
      expect(stats.filterReasons['Spam domain']).toBe(2);
      expect(stats.filterReasons['Marketing email']).toBe(1);
    });

    it('should handle empty email list for stats', () => {
      const stats = emailFilter.getFilteringStats([]);

      expect(stats.total).toBe(0);
      expect(stats.filtered).toBe(0);
      expect(stats.kept).toBe(0);
      expect(stats.filterRate).toBe(0);
      expect(Object.keys(stats.filterReasons)).toHaveLength(0);
    });

    it('should handle emails without filter reasons', () => {
      const filteredEmails: FilteredEmail[] = [
        { ...mockEmail, is_filtered: true, filter_reason: null, processed_at: '2024-01-01' },
        { ...mockEmail, is_filtered: true, filter_reason: '', processed_at: '2024-01-01' },
      ];

      const stats = emailFilter.getFilteringStats(filteredEmails);

      expect(stats.total).toBe(2);
      expect(stats.filtered).toBe(2);
      expect(Object.keys(stats.filterReasons)).toHaveLength(0);
    });
  });

  describe('validateEmailContent', () => {
    it('should validate correct email content', () => {
      const result = emailFilter.validateEmailContent(mockEmail);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidEmail: ParsedEmail = {
        ...mockEmail,
        sender: '',
        subject: '',
        body_text: '',
      };

      const result = emailFilter.validateEmailContent(invalidEmail);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing sender');
      expect(result.issues).toContain('Missing subject');
      expect(result.issues).toContain('Missing body text');
    });

    it('should detect email body that is too short', () => {
      const shortEmail: ParsedEmail = {
        ...mockEmail,
        body_text: 'Hi',
      };

      const result = emailFilter.validateEmailContent(shortEmail);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Email body too short');
    });

    it('should detect invalid date formats', () => {
      const invalidDateEmail: ParsedEmail = {
        ...mockEmail,
        date_sent: 'invalid-date',
      };

      const result = emailFilter.validateEmailContent(invalidDateEmail);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Invalid date format');
    });

    it('should handle whitespace-only fields', () => {
      const whitespaceEmail: ParsedEmail = {
        ...mockEmail,
        sender: '   ',
        subject: '\t\n',
        body_text: '   \n   ',
      };

      const result = emailFilter.validateEmailContent(whitespaceEmail);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing sender');
      expect(result.issues).toContain('Missing subject');
      expect(result.issues).toContain('Missing body text');
    });

    it('should handle null/undefined fields gracefully', () => {
      const nullEmail: ParsedEmail = {
        ...mockEmail,
        // @ts-ignore - Testing runtime behavior
        sender: null,
        // @ts-ignore - Testing runtime behavior
        subject: undefined,
      };

      const result = emailFilter.validateEmailContent(nullEmail);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing sender');
      expect(result.issues).toContain('Missing subject');
    });
  });

  describe('normalizeEmail', () => {
    it('should normalize email content', () => {
      const unnormalizedEmail: ParsedEmail = {
        ...mockEmail,
        sender: '  sender@example.com  ',
        subject: '\t  Subject with whitespace  \n',
        recipient: '   recipient@example.com   ',
        body_text: '  Body text with spaces  ',
        body_html: '\n  <p>HTML content</p>  \t',
      };

      const result = emailFilter.normalizeEmail(unnormalizedEmail);

      expect(result.sender).toBe('sender@example.com');
      expect(result.subject).toBe('Subject with whitespace');
      expect(result.recipient).toBe('recipient@example.com');
      expect(result.body_text).toBe('Body text with spaces');
      expect(result.body_html).toBe('<p>HTML content</p>');
    });

    it('should handle null/undefined fields in normalization', () => {
      const emailWithNulls: ParsedEmail = {
        ...mockEmail,
        // @ts-ignore - Testing runtime behavior
        sender: null,
        // @ts-ignore - Testing runtime behavior
        subject: undefined,
      };

      const result = emailFilter.normalizeEmail(emailWithNulls);

      expect(result.sender).toBe('');
      expect(result.subject).toBe('');
    });

    it('should preserve other email properties during normalization', () => {
      const result = emailFilter.normalizeEmail(mockEmail);

      expect(result.google_message_id).toBe('msg123');
      expect(result.thread_id).toBe('thread123');
      expect(result.date_sent).toBe('2024-01-01T00:00:00.000Z');
      expect(result.has_attachments).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle real-world filtering scenario', async () => {
      const realWorldEmails: ParsedEmail[] = [
        {
          google_message_id: 'msg1',
          thread_id: 'thread1',
          subject: 'Important Meeting',
          sender: 'colleague@company.com',
          recipient: 'user@company.com',
          body_text: 'Hi, let\'s schedule a meeting for tomorrow.',
          body_html: '<p>Hi, let\'s schedule a meeting for tomorrow.</p>',
          date_sent: '2024-01-01T09:00:00.000Z',
          has_attachments: false,
        },
        {
          google_message_id: 'msg2',
          thread_id: 'thread2',
          subject: 'Special Offer - 50% Off!',
          sender: 'marketing@store.com',
          recipient: 'user@company.com',
          body_text: 'Don\'t miss our amazing sale! Unsubscribe here.',
          body_html: '<p>Don\'t miss our amazing sale! <a href="#">Unsubscribe</a></p>',
          date_sent: '2024-01-01T10:00:00.000Z',
          has_attachments: false,
        },
        {
          google_message_id: 'msg3',
          thread_id: 'thread3',
          subject: 'noreply - Account verification',
          sender: 'noreply@service.com',
          recipient: 'user@company.com',
          body_text: 'Please verify your account by clicking the link.',
          body_html: '<p>Please verify your account by clicking the link.</p>',
          date_sent: '2024-01-01T11:00:00.000Z',
          has_attachments: false,
        },
      ];

      const userConfigs: FilterConfig[] = [
        { id: '1', user_id: 'user1', domain_pattern: 'store.com', filter_type: 'blacklist', created_at: '2024-01-01' },
        { id: '2', user_id: 'user1', domain_pattern: 'company.com', filter_type: 'whitelist', created_at: '2024-01-01' },
      ];

      // Mock domain filter to simulate realistic filtering behavior
      mockDomainFilter.filterEmail.mockImplementation((sender, subject, body) => {
        if (sender.includes('company.com')) {
          return { isFiltered: false, reason: 'Whitelisted domain: company.com', confidence: 1.0 };
        }
        if (subject.toLowerCase().includes('special offer') || body.includes('Unsubscribe')) {
          return { isFiltered: true, reason: 'Marketing email detected', confidence: 0.8 };
        }
        if (sender.includes('noreply') || subject.includes('noreply')) {
          return { isFiltered: true, reason: 'Automated/system email detected', confidence: 0.8 };
        }
        return { isFiltered: false, reason: null, confidence: 0 };
      });

      const results = await emailFilter.filterEmails(realWorldEmails, userConfigs);
      const stats = emailFilter.getFilteringStats(results);

      expect(results).toHaveLength(3);
      expect(results[0].is_filtered).toBe(false); // Company email, whitelisted
      expect(results[1].is_filtered).toBe(true);  // Marketing email
      expect(results[2].is_filtered).toBe(true);  // Automated noreply email

      expect(stats.total).toBe(3);
      expect(stats.filtered).toBe(2);
      expect(stats.kept).toBe(1);
      expect(stats.filterRate).toBe(66.66666666666666);
    });

    it('should handle edge case with mixed filter conditions', async () => {
      // Email that could match multiple filter conditions
      const complexEmail: ParsedEmail = {
        google_message_id: 'complex1',
        thread_id: 'thread1',
        subject: 'Automated Marketing Newsletter - Unsubscribe',
        sender: 'noreply-marketing@large-retailer.com',
        recipient: 'user@example.com',
        body_text: 'This is an automated promotional email with discount offers. Click to unsubscribe.',
        body_html: '<p>This is an automated promotional email with discount offers. <a href="#">Unsubscribe</a></p>',
        date_sent: '2024-01-01T12:00:00.000Z',
        has_attachments: false,
      };

      // Mock to return the first (most confident) filter match
      mockDomainFilter.filterEmail.mockReturnValue({
        isFiltered: true,
        reason: 'Automated/system email detected',
        confidence: 0.9,
      });

      const result = await emailFilter.filterEmail(complexEmail, []);

      expect(result.is_filtered).toBe(true);
      expect(result.filter_reason).toBe('Automated/system email detected');
    });
  });

  describe('performance considerations', () => {
    it('should handle large batches of emails efficiently', async () => {
      const largeEmailBatch: ParsedEmail[] = Array.from({ length: 1000 }, (_, i) => ({
        ...mockEmail,
        google_message_id: `msg${i}`,
        sender: `sender${i}@example.com`,
      }));

      const startTime = Date.now();
      const results = await emailFilter.filterEmails(largeEmailBatch, mockFilterConfigs);
      const endTime = Date.now();

      expect(results).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockDomainFilter.filterEmail).toHaveBeenCalledTimes(1000);
    });

    it('should maintain consistent processing time per email', async () => {
      // Process same email multiple times to check consistency
      const processingTimes: number[] = [];

      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        await emailFilter.filterEmail(mockEmail, mockFilterConfigs);
        const endTime = Date.now();
        processingTimes.push(endTime - startTime);
      }

      // Check that processing times are reasonably consistent (within 100ms variation)
      const maxTime = Math.max(...processingTimes);
      const minTime = Math.min(...processingTimes);
      expect(maxTime - minTime).toBeLessThan(100);
    });
  });
});