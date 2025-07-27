import { FilterResult, FilterConfig } from '@jessie/lib';
import { DomainFilter } from './domainFilter';
import { ParsedEmail } from '../gmail/service';

export interface FilteredEmail extends ParsedEmail {
  is_filtered: boolean;
  filter_reason: string | null;
  processed_at: string;
}

export class EmailFilter {
  private domainFilter: DomainFilter;

  constructor() {
    this.domainFilter = new DomainFilter();
  }

  /**
   * Apply all filters to a single email
   */
  async filterEmail(
    email: ParsedEmail, 
    userFilterConfigs: FilterConfig[] = []
  ): Promise<FilteredEmail> {
    const processedAt = new Date().toISOString();
    
    try {
      // Extract custom blacklist/whitelist from user configurations
      const customBlacklist = userFilterConfigs
        .filter(config => config.filter_type === 'blacklist')
        .map(config => config.domain_pattern);
      
      const customWhitelist = userFilterConfigs
        .filter(config => config.filter_type === 'whitelist')
        .map(config => config.domain_pattern);

      // Apply domain and content filtering
      const domainResult = this.domainFilter.filterEmail(
        email.sender,
        email.subject,
        email.body_text,
        customBlacklist,
        customWhitelist
      );

      // Check email size
      const sizeResult = this.domainFilter.checkEmailSize(
        email.body_text,
        email.body_html
      );

      // Determine final filtering result
      let finalResult: FilterResult;
      
      if (domainResult.isFiltered) {
        finalResult = domainResult;
      } else if (sizeResult.isFiltered) {
        finalResult = sizeResult;
      } else {
        finalResult = {
          isFiltered: false,
          reason: null,
          confidence: 0,
        };
      }

      return {
        ...email,
        is_filtered: finalResult.isFiltered,
        filter_reason: finalResult.reason,
        processed_at: processedAt,
      };

    } catch (error) {
      console.error('Error filtering email:', error);
      
      // In case of error, don't filter the email
      return {
        ...email,
        is_filtered: false,
        filter_reason: 'Filter error - not filtered',
        processed_at: processedAt,
      };
    }
  }

  /**
   * Apply filters to multiple emails in batch
   */
  async filterEmails(
    emails: ParsedEmail[], 
    userFilterConfigs: FilterConfig[] = []
  ): Promise<FilteredEmail[]> {
    const filteredEmails: FilteredEmail[] = [];
    
    for (const email of emails) {
      const filteredEmail = await this.filterEmail(email, userFilterConfigs);
      filteredEmails.push(filteredEmail);
    }

    return filteredEmails;
  }

  /**
   * Get filtering statistics for a batch of emails
   */
  getFilteringStats(filteredEmails: FilteredEmail[]): {
    total: number;
    filtered: number;
    kept: number;
    filterReasons: Record<string, number>;
    filterRate: number;
  } {
    const stats = {
      total: filteredEmails.length,
      filtered: 0,
      kept: 0,
      filterReasons: {} as Record<string, number>,
      filterRate: 0,
    };

    for (const email of filteredEmails) {
      if (email.is_filtered) {
        stats.filtered++;
        if (email.filter_reason) {
          stats.filterReasons[email.filter_reason] = 
            (stats.filterReasons[email.filter_reason] || 0) + 1;
        }
      } else {
        stats.kept++;
      }
    }

    stats.filterRate = stats.total > 0 ? (stats.filtered / stats.total) * 100 : 0;

    return stats;
  }

  /**
   * Validate email content for potential issues
   */
  validateEmailContent(email: ParsedEmail): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check for required fields
    if (!email.sender || email.sender.trim() === '') {
      issues.push('Missing sender');
    }

    if (!email.subject || email.subject.trim() === '') {
      issues.push('Missing subject');
    }

    if (!email.body_text || email.body_text.trim() === '') {
      issues.push('Missing body text');
    }

    // Check for suspicious patterns
    if (email.body_text && email.body_text.length < 10) {
      issues.push('Email body too short');
    }

    // Check date validity
    try {
      const dateObj = new Date(email.date_sent);
      if (isNaN(dateObj.getTime())) {
        issues.push('Invalid date format');
      }
    } catch {
      issues.push('Invalid date format');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Clean and normalize email content
   */
  normalizeEmail(email: ParsedEmail): ParsedEmail {
    return {
      ...email,
      sender: email.sender?.trim() || '',
      subject: email.subject?.trim() || '',
      recipient: email.recipient?.trim() || '',
      body_text: email.body_text?.trim() || '',
      body_html: email.body_html?.trim() || '',
    };
  }
}