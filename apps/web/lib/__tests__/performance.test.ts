import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HtmlParser } from '../parsers/htmlParser';
import { EmailFilter } from '../filters/emailFilter';
import { DomainFilter } from '../filters/domainFilter';

// Mock heavy dependencies for performance testing
vi.mock('pdf-parse');
vi.mock('mammoth');
vi.mock('cheerio');

describe('Content Filtering Performance Tests', () => {
  let htmlParser: HtmlParser;
  let emailFilter: EmailFilter;
  let domainFilter: DomainFilter;

  beforeEach(() => {
    htmlParser = new HtmlParser();
    emailFilter = new EmailFilter();
    domainFilter = new DomainFilter();
  });

  describe('HTML Parser Performance', () => {
    it('should parse large HTML content efficiently', () => {
      // Create a large HTML document
      const createLargeHtml = (size: number) => {
        let html = '<html><body>';
        for (let i = 0; i < size; i++) {
          html += `<p>This is paragraph ${i} with some content that simulates real email content.</p>`;
          if (i % 10 === 0) {
            html += `<div><h2>Section ${Math.floor(i / 10)}</h2><ul>`;
            for (let j = 0; j < 5; j++) {
              html += `<li>List item ${j} in section ${Math.floor(i / 10)}</li>`;
            }
            html += '</ul></div>';
          }
        }
        html += '</body></html>';
        return html;
      };

      const largeHtml = createLargeHtml(1000); // ~100KB of HTML
      const startTime = process.hrtime.bigint();
      const startMemory = process.memoryUsage().heapUsed;

      const result = htmlParser.parseHtmlEmail(largeHtml);

      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage().heapUsed;

      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
      const memoryUsed = (endMemory - startMemory) / 1024 / 1024; // Convert to MB

      expect(result.plainText).toBeDefined();
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      
      // Performance expectations
      expect(duration).toBeLessThan(500); // Should complete within 500ms
      expect(memoryUsed).toBeLessThan(10); // Should use less than 10MB additional memory
    });

    it('should handle multiple HTML parsing operations concurrently', async () => {
      const htmlContent = `
        <html>
          <body>
            <h1>Test Document</h1>
            <p>This is test content with <strong>formatting</strong> and <a href="http://example.com">links</a>.</p>
            <table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>
          </body>
        </html>
      `;

      const startTime = process.hrtime.bigint();
      
      // Process multiple HTML documents concurrently
      const promises = Array.from({ length: 100 }, (_, i) => 
        Promise.resolve(htmlParser.parseHtmlEmail(htmlContent.replace('Test Document', `Test Document ${i}`)))
      );

      const results = await Promise.all(promises);
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000;

      expect(results).toHaveLength(100);
      expect(results.every(r => r.plainText.includes('Test Document'))).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should maintain consistent performance with varying content sizes', () => {
      const sizes = [100, 500, 1000, 2000]; // Different content sizes
      const performanceResults: { size: number; duration: number; memory: number }[] = [];

      sizes.forEach(size => {
        const content = '<p>' + 'Lorem ipsum dolor sit amet. '.repeat(size) + '</p>';
        
        const startTime = process.hrtime.bigint();
        const startMemory = process.memoryUsage().heapUsed;
        
        htmlParser.parseHtmlEmail(content);
        
        const endTime = process.hrtime.bigint();
        const endMemory = process.memoryUsage().heapUsed;
        
        const duration = Number(endTime - startTime) / 1_000_000;
        const memory = (endMemory - startMemory) / 1024 / 1024;
        
        performanceResults.push({ size, duration, memory });
      });

      // Performance should scale reasonably with content size
      const maxDuration = Math.max(...performanceResults.map(r => r.duration));
      const maxMemory = Math.max(...performanceResults.map(r => r.memory));
      
      expect(maxDuration).toBeLessThan(200); // Even largest content should parse quickly
      expect(maxMemory).toBeLessThan(5); // Memory usage should be reasonable
      
      // Check that performance scales linearly, not exponentially
      const smallSize = performanceResults[0];
      const largeSize = performanceResults[performanceResults.length - 1];
      const sizeRatio = largeSize.size / smallSize.size;
      const durationRatio = largeSize.duration / smallSize.duration;
      
      // Duration ratio should not be much larger than size ratio (indicating good scalability)
      expect(durationRatio).toBeLessThan(sizeRatio * 2);
    });
  });

  describe('Email Filter Performance', () => {
    it('should filter large batches of emails efficiently', async () => {
      const createMockEmail = (id: number) => ({
        google_message_id: `msg${id}`,
        thread_id: `thread${id}`,
        subject: `Subject ${id}`,
        sender: `sender${id}@example.com`,
        recipient: 'recipient@example.com',
        body_text: `This is email body ${id} with some content for filtering.`,
        body_html: `<p>This is email body ${id} with some content for filtering.</p>`,
        date_sent: new Date().toISOString(),
        has_attachments: false,
      });

      const largeBatch = Array.from({ length: 5000 }, (_, i) => createMockEmail(i));
      
      const startTime = process.hrtime.bigint();
      const startMemory = process.memoryUsage().heapUsed;

      const results = await emailFilter.filterEmails(largeBatch, []);

      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage().heapUsed;

      const duration = Number(endTime - startTime) / 1_000_000;
      const memoryUsed = (endMemory - startMemory) / 1024 / 1024;

      expect(results).toHaveLength(5000);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(memoryUsed).toBeLessThan(50); // Should use less than 50MB additional memory

      // Check processing rate
      const emailsPerSecond = largeBatch.length / (duration / 1000);
      expect(emailsPerSecond).toBeGreaterThan(500); // Should process at least 500 emails/second
    });

    it('should maintain memory efficiency during repeated filtering', async () => {
      const createMockEmail = (id: number) => ({
        google_message_id: `msg${id}`,
        thread_id: `thread${id}`,
        subject: `Subject ${id}`,
        sender: `sender${id % 100}@example.com`, // Repeat senders to test caching
        recipient: 'recipient@example.com',
        body_text: `Email body ${id}`,
        body_html: `<p>Email body ${id}</p>`,
        date_sent: new Date().toISOString(),
        has_attachments: false,
      });

      const initialMemory = process.memoryUsage().heapUsed;
      const memoryReadings: number[] = [];

      // Process multiple batches
      for (let batch = 0; batch < 10; batch++) {
        const emails = Array.from({ length: 500 }, (_, i) => createMockEmail(batch * 500 + i));
        await emailFilter.filterEmails(emails, []);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        const currentMemory = process.memoryUsage().heapUsed;
        memoryReadings.push((currentMemory - initialMemory) / 1024 / 1024);
      }

      // Memory usage should not grow significantly with repeated operations
      const maxMemoryUsage = Math.max(...memoryReadings);
      const avgMemoryUsage = memoryReadings.reduce((a, b) => a + b, 0) / memoryReadings.length;
      
      expect(maxMemoryUsage).toBeLessThan(20); // Should not exceed 20MB
      expect(avgMemoryUsage).toBeLessThan(10); // Average should be under 10MB
    });

    it('should demonstrate cache effectiveness on filtering performance', async () => {
      const createMockEmail = (sender: string, subject: string, body: string) => ({
        google_message_id: `msg-${Date.now()}-${Math.random()}`,
        thread_id: 'thread123',
        subject,
        sender,
        recipient: 'recipient@example.com',
        body_text: body,
        body_html: `<p>${body}</p>`,
        date_sent: new Date().toISOString(),
        has_attachments: false,
      });

      // Create emails with repeated patterns (should benefit from caching)
      const repeatedEmails = Array.from({ length: 1000 }, (_, i) => {
        const patternIndex = i % 10; // Only 10 unique patterns
        return createMockEmail(
          `sender${patternIndex}@example.com`,
          `Subject ${patternIndex}`,
          `Body content ${patternIndex}`
        );
      });

      // First run - cold cache
      const startTime1 = process.hrtime.bigint();
      await emailFilter.filterEmails(repeatedEmails, []);
      const endTime1 = process.hrtime.bigint();
      const duration1 = Number(endTime1 - startTime1) / 1_000_000;

      // Second run - warm cache (same patterns)
      const startTime2 = process.hrtime.bigint();
      await emailFilter.filterEmails(repeatedEmails, []);
      const endTime2 = process.hrtime.bigint();
      const duration2 = Number(endTime2 - startTime2) / 1_000_000;

      // Second run should be significantly faster due to caching
      const speedupRatio = duration1 / duration2;
      expect(speedupRatio).toBeGreaterThan(1.2); // At least 20% faster with cache
    });
  });

  describe('Domain Filter Performance', () => {
    it('should handle large domain lists efficiently', () => {
      const largeDomainList = Array.from({ length: 10000 }, (_, i) => `domain${i}.com`);
      
      const startTime = process.hrtime.bigint();
      
      // Test filtering against large lists
      for (let i = 0; i < 1000; i++) {
        const testSender = `test${i}@domain${i % 100}.com`;
        domainFilter.filterEmail(testSender, 'Subject', 'Body', largeDomainList, []);
      }
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000;
      
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should scale well with complex content patterns', () => {
      const complexEmails = [
        {
          sender: 'marketing@company.com',
          subject: 'Special Offer - 50% OFF - Limited Time - Newsletter - Unsubscribe',
          body: 'This is a promotional email with discount offers and sale information. Click here to unsubscribe from our newsletter and stop receiving marketing emails.',
        },
        {
          sender: 'noreply@system.com',
          subject: 'Automated System Notification - Account Verification Required',
          body: 'This is an automatic message about your account verification. This system notification was generated automatically.',
        },
        {
          sender: 'friend@personal.com',
          subject: 'Hey, how are you doing?',
          body: 'Just wanted to catch up and see how things are going with your project.',
        },
      ];

      const startTime = process.hrtime.bigint();
      
      // Process many emails with complex patterns
      for (let i = 0; i < 1000; i++) {
        const email = complexEmails[i % complexEmails.length];
        domainFilter.filterEmail(email.sender, email.subject, email.body);
      }
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory during intensive HTML parsing', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const memoryReadings: number[] = [];

      // Parse many HTML documents
      for (let i = 0; i < 100; i++) {
        const html = `<html><body>${'<p>Content </p>'.repeat(100)}</body></html>`;
        htmlParser.parseHtmlEmail(html);
        
        if (i % 10 === 0) {
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
          const currentMemory = process.memoryUsage().heapUsed;
          memoryReadings.push(currentMemory - initialMemory);
        }
      }

      // Memory usage should stabilize and not grow indefinitely
      const firstReading = memoryReadings[0];
      const lastReading = memoryReadings[memoryReadings.length - 1];
      const memoryGrowth = (lastReading - firstReading) / 1024 / 1024; // MB

      expect(memoryGrowth).toBeLessThan(5); // Should not grow more than 5MB
    });

    it('should not leak memory during repeated filtering operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const memoryReadings: number[] = [];

      const createTestEmail = (id: number) => ({
        google_message_id: `msg${id}`,
        thread_id: `thread${id}`,
        subject: `Subject ${id}`,
        sender: `sender${id}@example.com`,
        recipient: 'recipient@example.com',
        body_text: `Body ${id}`,
        body_html: `<p>Body ${id}</p>`,
        date_sent: new Date().toISOString(),
        has_attachments: false,
      });

      // Perform many filtering operations
      for (let batch = 0; batch < 20; batch++) {
        const emails = Array.from({ length: 100 }, (_, i) => createTestEmail(batch * 100 + i));
        await emailFilter.filterEmails(emails, []);
        
        if (batch % 5 === 0) {
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
          const currentMemory = process.memoryUsage().heapUsed;
          memoryReadings.push(currentMemory - initialMemory);
        }
      }

      // Memory should not grow significantly
      const maxMemoryIncrease = Math.max(...memoryReadings) / 1024 / 1024; // MB
      expect(maxMemoryIncrease).toBeLessThan(10); // Should not increase more than 10MB
    });
  });

  describe('Stress Testing', () => {
    it('should handle extreme load conditions gracefully', async () => {
      const extremeLoadTest = async () => {
        const startTime = process.hrtime.bigint();
        const promises: Promise<any>[] = [];

        // Create multiple concurrent operations
        for (let i = 0; i < 50; i++) {
          // HTML parsing
          promises.push(Promise.resolve(htmlParser.parseHtmlEmail('<p>Test content</p>'.repeat(100))));
          
          // Email filtering
          const testEmail = {
            google_message_id: `stress-msg-${i}`,
            thread_id: `stress-thread-${i}`,
            subject: `Stress Test Subject ${i}`,
            sender: `stress${i}@example.com`,
            recipient: 'recipient@example.com',
            body_text: `Stress test body ${i}`,
            body_html: `<p>Stress test body ${i}</p>`,
            date_sent: new Date().toISOString(),
            has_attachments: false,
          };
          promises.push(emailFilter.filterEmail(testEmail, []));
        }

        const results = await Promise.all(promises);
        const endTime = process.hrtime.bigint();
        
        return {
          duration: Number(endTime - startTime) / 1_000_000,
          results: results.length,
        };
      };

      const testResult = await extremeLoadTest();
      
      expect(testResult.results).toBe(100); // All operations should complete
      expect(testResult.duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain performance under sustained load', async () => {
      const sustainedLoadTest = async (duration: number) => {
        const startTime = Date.now();
        let operationCount = 0;
        const performanceReadings: number[] = [];

        while (Date.now() - startTime < duration) {
          const batchStart = process.hrtime.bigint();
          
          // Perform a batch of operations
          const batchPromises = Array.from({ length: 10 }, (_, i) => {
            const email = {
              google_message_id: `sustained-${operationCount}-${i}`,
              thread_id: 'thread',
              subject: 'Sustained load test',
              sender: `test${operationCount}@example.com`,
              recipient: 'recipient@example.com',
              body_text: 'Test body',
              body_html: '<p>Test body</p>',
              date_sent: new Date().toISOString(),
              has_attachments: false,
            };
            return emailFilter.filterEmail(email, []);
          });

          await Promise.all(batchPromises);
          
          const batchEnd = process.hrtime.bigint();
          const batchDuration = Number(batchEnd - batchStart) / 1_000_000;
          performanceReadings.push(batchDuration);
          
          operationCount += 10;
        }

        return {
          totalOperations: operationCount,
          avgBatchTime: performanceReadings.reduce((a, b) => a + b, 0) / performanceReadings.length,
          maxBatchTime: Math.max(...performanceReadings),
          minBatchTime: Math.min(...performanceReadings),
        };
      };

      const result = await sustainedLoadTest(3000); // 3 second sustained load test
      
      expect(result.totalOperations).toBeGreaterThan(100); // Should process many operations
      expect(result.maxBatchTime).toBeLessThan(500); // Max batch time should be reasonable
      expect(result.maxBatchTime / result.minBatchTime).toBeLessThan(5); // Performance should be consistent
    });
  });
});