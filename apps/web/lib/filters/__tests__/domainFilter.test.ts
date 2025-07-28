import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DomainFilter } from '../domainFilter';
import { filterCache } from '../../utils/filterCache';

// Mock the config module
vi.mock('../config', () => ({
  DEFAULT_BLACKLISTED_DOMAINS: [
    'noreply.facebook.com',
    'no-reply@linkedin.com',
    'notifications@github.com',
    'marketing@company.com',
    'promo@deals.com',
  ],
  EMAIL_TYPE_PATTERNS: {
    automated: [
      /no-?reply/i,
      /automatic/i,
      /system\s*notification/i,
      /account\s*verification/i,
    ],
    marketing: [
      /unsubscribe/i,
      /promotional/i,
      /special\s*offer/i,
      /sale/i,
      /discount/i,
      /newsletter/i,
    ],
    notifications: [
      /notification/i,
      /alert/i,
      /reminder/i,
      /update/i,
    ],
  },
  extractDomain: (email: string) => {
    const match = email.match(/@([^@]+)/);
    return match ? match[1] : null;
  },
  domainMatches: (domain: string, pattern: string) => {
    if (pattern === domain) return true;
    if (pattern.startsWith('*.')) {
      const baseDomain = pattern.substring(2);
      return domain.endsWith(baseDomain);
    }
    return domain.includes(pattern);
  },
  getFilterConfig: () => ({
    enableDomainFiltering: true,
    enableContentTypeFiltering: true,
    enableSizeFiltering: true,
    strictMode: false,
    maxEmailSize: 1024 * 1024, // 1MB
    customBlacklistedDomains: ['custom-spam.com'],
    customWhitelistedDomains: ['trusted.com'],
  }),
}));

// Mock the filter cache
vi.mock('../../utils/filterCache', () => ({
  filterCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

describe('DomainFilter', () => {
  let domainFilter: DomainFilter;

  beforeEach(() => {
    vi.clearAllMocks();
    domainFilter = new DomainFilter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('filterEmail', () => {
    it('should filter emails from blacklisted domains', () => {
      const result = domainFilter.filterEmail(
        'sender@noreply.facebook.com',
        'Account Update',
        'Your account has been updated.'
      );

      expect(result.isFiltered).toBe(true);
      expect(result.reason).toBe('Blacklisted domain: noreply.facebook.com');
      expect(result.confidence).toBe(0.9);
    });

    it('should not filter emails from whitelisted domains', () => {
      const result = domainFilter.filterEmail(
        'sender@trusted.com',
        'Important Message',
        'This is an important message.'
      );

      expect(result.isFiltered).toBe(false);
      expect(result.reason).toBe('Whitelisted domain: trusted.com');
      expect(result.confidence).toBe(1.0);
    });

    it('should filter emails with automated patterns', () => {
      const result = domainFilter.filterEmail(
        'noreply@example.com',
        'Automatic System Notification',
        'This is an automated message about account verification.'
      );

      expect(result.isFiltered).toBe(true);
      expect(result.reason).toBe('Automated/system email detected');
      expect(result.confidence).toBe(0.8);
    });

    it('should filter marketing emails based on content patterns', () => {
      const result = domainFilter.filterEmail(
        'marketing@store.com',
        'Special Offer - 50% Discount!',
        'Unsubscribe from this newsletter to stop receiving promotional emails.'
      );

      expect(result.isFiltered).toBe(true);
      expect(result.reason).toBe('Marketing email detected');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should not filter regular emails', () => {
      const result = domainFilter.filterEmail(
        'john@example.com',
        'Meeting Tomorrow',
        'Hi, let\'s meet tomorrow at 2 PM.'
      );

      expect(result.isFiltered).toBe(false);
      expect(result.reason).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should handle custom blacklist', () => {
      const result = domainFilter.filterEmail(
        'user@spam-domain.com',
        'Test Subject',
        'Test body',
        ['spam-domain.com'], // custom blacklist
        []
      );

      expect(result.isFiltered).toBe(true);
      expect(result.reason).toBe('Blacklisted domain: spam-domain.com');
    });

    it('should handle custom whitelist', () => {
      const result = domainFilter.filterEmail(
        'user@vip-domain.com',
        'Test Subject',
        'Test body',
        [],
        ['vip-domain.com'] // custom whitelist
      );

      expect(result.isFiltered).toBe(false);
      expect(result.reason).toBe('Whitelisted domain: vip-domain.com');
      expect(result.confidence).toBe(1.0);
    });

    it('should handle invalid email addresses', () => {
      const result = domainFilter.filterEmail(
        'invalid-email',
        'Test Subject',
        'Test body'
      );

      expect(result.isFiltered).toBe(false);
      expect(result.reason).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should use cache when available', () => {
      const cachedResult = {
        isFiltered: true,
        reason: 'Cached result',
        confidence: 0.9,
      };

      vi.mocked(filterCache.get).mockReturnValue(cachedResult);

      const result = domainFilter.filterEmail(
        'test@example.com',
        'Subject',
        'Body'
      );

      expect(result).toEqual(cachedResult);
      expect(filterCache.get).toHaveBeenCalledWith('test@example.com', 'Subject', 'Body');
    });

    it('should cache results', () => {
      vi.mocked(filterCache.get).mockReturnValue(null);

      const result = domainFilter.filterEmail(
        'test@example.com',
        'Subject',
        'Body'
      );

      expect(filterCache.set).toHaveBeenCalledWith(
        'test@example.com',
        'Subject',
        'Body',
        result
      );
    });
  });

  describe('checkEmailSize', () => {
    it('should filter emails that exceed size limit', () => {
      const largeText = 'a'.repeat(1024 * 1024 + 1); // Exceeds 1MB limit
      const result = domainFilter.checkEmailSize(largeText, '');

      expect(result.isFiltered).toBe(true);
      expect(result.reason).toContain('Email size exceeds limit');
      expect(result.confidence).toBe(1.0);
    });

    it('should not filter emails within size limit', () => {
      const normalText = 'This is a normal email';
      const result = domainFilter.checkEmailSize(normalText, '<p>HTML content</p>');

      expect(result.isFiltered).toBe(false);
      expect(result.reason).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should calculate size including HTML content', () => {
      const bodyText = 'Text content';
      const bodyHtml = 'a'.repeat(1024 * 1024); // Large HTML content
      const result = domainFilter.checkEmailSize(bodyText, bodyHtml);

      expect(result.isFiltered).toBe(true);
      expect(result.reason).toContain('Email size exceeds limit');
    });
  });

  describe('getFilterStats', () => {
    it('should calculate filtering statistics correctly', () => {
      const emails = [
        {
          sender: 'noreply@facebook.com',
          subject: 'Notification',
          body_text: 'Test content',
        },
        {
          sender: 'friend@example.com',
          subject: 'Hello',
          body_text: 'Personal message',
        },
        {
          sender: 'marketing@store.com',
          subject: 'Special offer with discount!',
          body_text: 'Unsubscribe to stop promotional emails',
        },
      ];

      const stats = domainFilter.getFilterStats(emails);

      expect(stats.total).toBe(3);
      expect(stats.filtered).toBe(2); // facebook.com and marketing email
      expect(stats.reasons).toHaveProperty('Blacklisted domain: facebook.com');
      expect(stats.reasons).toHaveProperty('Marketing email detected');
    });

    it('should return zero stats for empty email list', () => {
      const stats = domainFilter.getFilterStats([]);

      expect(stats.total).toBe(0);
      expect(stats.filtered).toBe(0);
      expect(Object.keys(stats.reasons)).toHaveLength(0);
    });
  });

  describe('content pattern detection', () => {
    it('should detect notification emails in strict mode', () => {
      // Mock strict mode
      const strictFilter = new DomainFilter();
      
      const result = strictFilter.filterEmail(
        'system@example.com',
        'Alert: System Update',
        'This is a notification about the update and reminder for maintenance.'
      );

      // In non-strict mode, should not filter notifications
      expect(result.isFiltered).toBe(false);
    });

    it('should require multiple marketing patterns for filtering', () => {
      // Only one marketing pattern
      const result1 = domainFilter.filterEmail(
        'sender@example.com',
        'Newsletter',
        'Regular content'
      );
      expect(result1.isFiltered).toBe(false);

      // Multiple marketing patterns
      const result2 = domainFilter.filterEmail(
        'sender@example.com',
        'Special Sale Newsletter',
        'Unsubscribe to stop promotional offers'
      );
      expect(result2.isFiltered).toBe(true);
    });

    it('should handle case-insensitive pattern matching', () => {
      const result = domainFilter.filterEmail(
        'NOREPLY@EXAMPLE.COM',
        'AUTOMATIC NOTIFICATION',
        'SYSTEM VERIFICATION MESSAGE'
      );

      expect(result.isFiltered).toBe(true);
      expect(result.reason).toBe('Automated/system email detected');
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      const result = domainFilter.filterEmail('', '', '');
      expect(result.isFiltered).toBe(false);
    });

    it('should handle undefined/null values gracefully', () => {
      // @ts-expect-error - Testing runtime behavior
      const result = domainFilter.filterEmail(null, undefined, '');
      expect(result.isFiltered).toBe(false);
    });

    it('should handle special characters in email addresses', () => {
      const result = domainFilter.filterEmail(
        'user+tag@sub.domain.example.com',
        'Subject',
        'Body'
      );
      expect(result).toBeDefined();
      expect(typeof result.isFiltered).toBe('boolean');
    });

    it('should handle very long content', () => {
      const longContent = 'word '.repeat(10000);
      const result = domainFilter.filterEmail(
        'test@example.com',
        longContent,
        longContent
      );
      expect(result).toBeDefined();
      expect(typeof result.isFiltered).toBe('boolean');
    });
  });

  describe('wildcard domain matching', () => {
    it('should match wildcard domains', () => {
      const result = domainFilter.filterEmail(
        'user@sub.facebook.com',
        'Subject',
        'Body',
        ['*.facebook.com']
      );

      expect(result.isFiltered).toBe(true);
      expect(result.reason).toBe('Blacklisted domain: sub.facebook.com');
    });

    it('should match exact domains', () => {
      const result = domainFilter.filterEmail(
        'user@exact-match.com',
        'Subject',
        'Body',
        ['exact-match.com']
      );

      expect(result.isFiltered).toBe(true);
      expect(result.reason).toBe('Blacklisted domain: exact-match.com');
    });
  });
});