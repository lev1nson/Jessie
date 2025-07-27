import { FilterResult } from '@jessie/lib';
import { 
  DEFAULT_BLACKLISTED_DOMAINS, 
  EMAIL_TYPE_PATTERNS, 
  extractDomain, 
  domainMatches,
  getFilterConfig 
} from './config';
import { filterCache } from '../utils/filterCache';

export class DomainFilter {
  private config = getFilterConfig();

  /**
   * Filter email based on sender domain and content patterns
   */
  filterEmail(
    sender: string, 
    subject: string, 
    bodyText: string,
    customBlacklist: string[] = [],
    customWhitelist: string[] = []
  ): FilterResult {
    // Check cache first
    const cachedResult = filterCache.get(sender, subject, bodyText);
    if (cachedResult) {
      return cachedResult;
    }

    const domain = extractDomain(sender);
    
    if (!domain) {
      const result = {
        isFiltered: false,
        reason: null,
        confidence: 0,
      };
      filterCache.set(sender, subject, bodyText, result);
      return result;
    }

    // Check whitelist first (if domain is whitelisted, never filter)
    if (this.config.enableDomainFiltering) {
      const whitelistDomains = [
        ...this.config.customWhitelistedDomains,
        ...customWhitelist
      ];
      
      for (const whitelistDomain of whitelistDomains) {
        if (domainMatches(domain, whitelistDomain)) {
          const result = {
            isFiltered: false,
            reason: `Whitelisted domain: ${domain}`,
            confidence: 1.0,
          };
          filterCache.set(sender, subject, bodyText, result);
          return result;
        }
      }
    }

    // Check blacklisted domains
    if (this.config.enableDomainFiltering) {
      const blacklistDomains = [
        ...DEFAULT_BLACKLISTED_DOMAINS,
        ...this.config.customBlacklistedDomains,
        ...customBlacklist
      ];

      for (const blacklistDomain of blacklistDomains) {
        if (domainMatches(domain, blacklistDomain)) {
          const result = {
            isFiltered: true,
            reason: `Blacklisted domain: ${domain}`,
            confidence: 0.9,
          };
          filterCache.set(sender, subject, bodyText, result);
          return result;
        }
      }
    }

    // Check content type patterns
    if (this.config.enableContentTypeFiltering) {
      const contentResult = this.checkContentPatterns(sender, subject, bodyText);
      if (contentResult.isFiltered) {
        filterCache.set(sender, subject, bodyText, contentResult);
        return contentResult;
      }
    }

    const result = {
      isFiltered: false,
      reason: null,
      confidence: 0,
    };
    filterCache.set(sender, subject, bodyText, result);
    return result;
  }

  /**
   * Check email content for marketing/promotional patterns
   */
  private checkContentPatterns(
    sender: string, 
    subject: string, 
    bodyText: string
  ): FilterResult {
    const fullContent = `${sender} ${subject} ${bodyText}`.toLowerCase();
    
    // Check for automated/system emails
    for (const pattern of EMAIL_TYPE_PATTERNS.automated) {
      if (pattern.test(fullContent)) {
        return {
          isFiltered: true,
          reason: 'Automated/system email detected',
          confidence: 0.8,
        };
      }
    }

    // Check for marketing emails
    let marketingScore = 0;
    for (const pattern of EMAIL_TYPE_PATTERNS.marketing) {
      if (pattern.test(fullContent)) {
        marketingScore += 1;
      }
    }

    if (marketingScore >= 2) {
      return {
        isFiltered: true,
        reason: 'Marketing email detected',
        confidence: Math.min(0.7 + (marketingScore * 0.1), 0.95),
      };
    }

    // Check for notification emails (less aggressive filtering)
    if (this.config.strictMode) {
      let notificationScore = 0;
      for (const pattern of EMAIL_TYPE_PATTERNS.notifications) {
        if (pattern.test(fullContent)) {
          notificationScore += 1;
        }
      }

      if (notificationScore >= 3) {
        return {
          isFiltered: true,
          reason: 'Notification email detected',
          confidence: 0.6,
        };
      }
    }

    return {
      isFiltered: false,
      reason: null,
      confidence: 0,
    };
  }

  /**
   * Check if email size exceeds limits
   */
  checkEmailSize(bodyText: string, bodyHtml: string): FilterResult {
    if (!this.config.enableSizeFiltering) {
      return {
        isFiltered: false,
        reason: null,
        confidence: 0,
      };
    }

    const totalSize = Buffer.byteLength(bodyText, 'utf8') + Buffer.byteLength(bodyHtml || '', 'utf8');
    
    if (totalSize > this.config.maxEmailSize) {
      return {
        isFiltered: true,
        reason: `Email size exceeds limit: ${totalSize} bytes`,
        confidence: 1.0,
      };
    }

    return {
      isFiltered: false,
      reason: null,
      confidence: 0,
    };
  }

  /**
   * Get filtering statistics
   */
  getFilterStats(emails: Array<{ sender: string; subject: string; body_text: string }>): {
    total: number;
    filtered: number;
    reasons: Record<string, number>;
  } {
    const stats = {
      total: emails.length,
      filtered: 0,
      reasons: {} as Record<string, number>,
    };

    for (const email of emails) {
      const result = this.filterEmail(email.sender, email.subject, email.body_text);
      if (result.isFiltered && result.reason) {
        stats.filtered++;
        stats.reasons[result.reason] = (stats.reasons[result.reason] || 0) + 1;
      }
    }

    return stats;
  }
}