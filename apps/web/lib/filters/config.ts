import { z } from 'zod';

// Default blacklisted domains (marketing, promotional, automated services)
export const DEFAULT_BLACKLISTED_DOMAINS = [
  // Generic marketing/promotional
  'no-reply.com',
  'noreply.com',
  'mailer-daemon.com',
  'do-not-reply.com',
  'donotreply.com',
  'marketing.com',
  'newsletter.com',
  'promo.com',
  'updates.com',
  'notifications.com',
  
  // Social media notifications
  'facebookmail.com',
  'mail.twitter.com',
  'linkedin.com',
  'instagram.com',
  'tiktok.com',
  'snapchat.com',
  
  // E-commerce and services
  'amazon.com',
  'amazonses.com',
  'ebay.com',
  'paypal.com',
  'stripe.com',
  'shopify.com',
  'mailchimp.com',
  'constantcontact.com',
  
  // Newsletter services
  'substack.com',
  'medium.com',
  'beehiiv.com',
  'convertkit.com',
  'mailerlite.com',
  
  // Common automated services
  'github.com',
  'gitlab.com',
  'bitbucket.org',
  'atlassian.com',
  'slack.com',
  'discord.com',
  'zoom.us',
  'calendly.com',
];

// Email types to filter out
export const EMAIL_TYPE_PATTERNS = {
  marketing: [
    /unsubscribe/i,
    /marketing/i,
    /promotional/i,
    /newsletter/i,
    /campaign/i,
    /offer/i,
    /deal/i,
    /sale/i,
    /discount/i,
  ],
  notifications: [
    /notification/i,
    /alert/i,
    /reminder/i,
    /update/i,
    /digest/i,
    /summary/i,
  ],
  automated: [
    /do.*not.*reply/i,
    /no.*reply/i,
    /automated/i,
    /system/i,
    /daemon/i,
    /postmaster/i,
  ],
};

// Validation schema for filter configuration
export const FilterConfigSchema = z.object({
  domain_pattern: z.string().min(1, 'Domain pattern is required'),
  filter_type: z.enum(['blacklist', 'whitelist']),
});

// Configuration for content filtering
export interface ContentFilterConfig {
  enableDomainFiltering: boolean;
  enableContentTypeFiltering: boolean;
  enableSizeFiltering: boolean;
  maxEmailSize: number; // in bytes
  customBlacklistedDomains: string[];
  customWhitelistedDomains: string[];
  strictMode: boolean; // more aggressive filtering
}

// Default configuration
export const DEFAULT_FILTER_CONFIG: ContentFilterConfig = {
  enableDomainFiltering: true,
  enableContentTypeFiltering: true,
  enableSizeFiltering: true,
  maxEmailSize: 10 * 1024 * 1024, // 10MB
  customBlacklistedDomains: [],
  customWhitelistedDomains: [],
  strictMode: false,
};

// Get filter configuration from environment or defaults
export function getFilterConfig(): ContentFilterConfig {
  return {
    enableDomainFiltering: process.env.ENABLE_DOMAIN_FILTERING !== 'false',
    enableContentTypeFiltering: process.env.ENABLE_CONTENT_TYPE_FILTERING !== 'false',
    enableSizeFiltering: process.env.ENABLE_SIZE_FILTERING !== 'false',
    maxEmailSize: parseInt(process.env.MAX_EMAIL_SIZE || '10485760', 10),
    customBlacklistedDomains: process.env.CUSTOM_BLACKLISTED_DOMAINS?.split(',') || [],
    customWhitelistedDomains: process.env.CUSTOM_WHITELISTED_DOMAINS?.split(',') || [],
    strictMode: process.env.FILTER_STRICT_MODE === 'true',
  };
}

// Helper function to extract domain from email address
export function extractDomain(email: string): string {
  const match = email.match(/@([^>]+)/);
  return match ? match[1].toLowerCase().trim() : '';
}

// Helper function to check if domain matches pattern
export function domainMatches(domain: string, pattern: string): boolean {
  // Simple wildcard matching
  const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
  return regex.test(domain);
}