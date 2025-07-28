import { describe, it, expect, beforeEach, vi } from 'vitest';
import VectorizationService from '../services/vectorizationService';
import TextProcessor from '../llm/textProcessor';
import { vectorizationCache } from '../utils/vectorizationCache';

// Mock external dependencies for performance testing
vi.mock('../llm/embeddingService');
vi.mock('../repositories/vectorRepository');

describe('Vectorization Performance Tests', () => {
  let vectorizationService: VectorizationService;
  let mockEmbeddingService: any;
  let mockVectorRepository: any;
  let textProcessor: TextProcessor;

  beforeEach(() => {
    // Create fast mocks for performance testing
    mockEmbeddingService = {
      generateEmbedding: vi.fn().mockResolvedValue({
        embedding: new Array(1536).fill(0.1), // Standard embedding size
        tokens: 100,
      }),
      generateBatchEmbeddings: vi.fn(),
    };

    mockVectorRepository = {
      isEmailVectorized: vi.fn().mockResolvedValue(false),
      saveEmailEmbedding: vi.fn().mockResolvedValue(undefined),
      batchSaveEmbeddings: vi.fn().mockResolvedValue(undefined),
      getEmailsForVectorization: vi.fn(),
      searchSimilarVectors: vi.fn().mockResolvedValue([]),
    };

    textProcessor = new TextProcessor();
    vectorizationService = new VectorizationService(
      mockEmbeddingService,
      textProcessor,
      mockVectorRepository
    );

    // Clear cache before each test
    vectorizationCache.clear();
  });

  describe('Single Email Performance', () => {
    it('should vectorize small email within time limit', async () => {
      const emailContent = {
        id: 'small-email',
        subject: 'Small Test Email',
        body_text: 'This is a small test email with minimal content.',
      };

      const startTime = Date.now();
      await vectorizationService.vectorizeEmail(emailContent);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large email content efficiently', async () => {
      // Create a large email (10KB of text)
      const largeText = 'A'.repeat(10240);
      const emailContent = {
        id: 'large-email',
        subject: 'Large Test Email',
        body_text: largeText,
      };

      const startTime = Date.now();
      await vectorizationService.vectorizeEmail(emailContent);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds

      // Verify chunking occurred for large content
      const saveCall = mockVectorRepository.saveEmailEmbedding.mock.calls[0];
      const textChunks = saveCall[2];
      expect(textChunks.chunks.length).toBeGreaterThan(1);
    });

    it('should process email with multiple attachments efficiently', async () => {
      const emailContent = {
        id: 'multi-attachment-email',
        subject: 'Email with Multiple Attachments',
        body_text: 'Please review the attached documents.',
        attachments: [
          {
            id: 'att-1',
            filename: 'doc1.pdf',
            mime_type: 'application/pdf',
            content_text: 'Content of first document. '.repeat(100),
          },
          {
            id: 'att-2',
            filename: 'doc2.pdf',
            mime_type: 'application/pdf',
            content_text: 'Content of second document. '.repeat(100),
          },
          {
            id: 'att-3',
            filename: 'doc3.docx',
            mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            content_text: 'Content of third document. '.repeat(100),
          },
        ],
      };

      const startTime = Date.now();
      await vectorizationService.vectorizeEmail(emailContent);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });

  describe('Batch Processing Performance', () => {
    it('should process small batch efficiently', async () => {
      const emails = Array.from({ length: 10 }, (_, i) => ({
        id: `batch-email-${i}`,
        subject: `Test Email ${i}`,
        body_text: `This is test email number ${i} with some content.`,
      }));

      const startTime = Date.now();
      const result = await vectorizationService.batchVectorizeEmails(emails, {
        batchSize: 5,
      });
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      const timePerEmail = processingTime / emails.length;

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(10);
      expect(timePerEmail).toBeLessThan(500); // Less than 500ms per email on average
    });

    it('should process large batch efficiently', async () => {
      const emails = Array.from({ length: 100 }, (_, i) => ({
        id: `large-batch-email-${i}`,
        subject: `Test Email ${i}`,
        body_text: `Email content ${i}. `.repeat(50), // ~1KB per email
      }));

      const startTime = Date.now();
      const result = await vectorizationService.batchVectorizeEmails(emails, {
        batchSize: 20,
      });
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      const timePerEmail = processingTime / emails.length;

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(100);
      expect(timePerEmail).toBeLessThan(200); // Less than 200ms per email on average
      expect(processingTime).toBeLessThan(20000); // Total time under 20 seconds
    });
  });

  describe('Text Processing Performance', () => {
    it('should clean text efficiently', () => {
      const dirtyText = '  This   has\\r\\n\\tmultiple\\n\\n\\nline\\tbreaks  \\r\\nand   spaces  ';
      const largeText = dirtyText.repeat(1000); // ~80KB

      const startTime = Date.now();
      const cleanedText = textProcessor.cleanText(largeText);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(100); // Should complete within 100ms
      expect(cleanedText.length).toBeLessThan(largeText.length);
    });

    it('should chunk text efficiently', () => {
      const longText = 'A'.repeat(50000); // 50KB

      const startTime = Date.now();
      const chunks = textProcessor.chunkText(longText);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(200); // Should complete within 200ms
      expect(chunks.length).toBeGreaterThan(5); // Should create multiple chunks
    });

    it('should combine texts efficiently', () => {
      const emailText = 'Email content '.repeat(100);
      const attachmentTexts = Array.from({ length: 10 }, (_, i) => 
        `Attachment ${i} content `.repeat(50)
      );

      const startTime = Date.now();
      const combinedText = textProcessor.combineTexts(emailText, attachmentTexts);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(50); // Should complete within 50ms
      expect(combinedText).toContain('EMAIL CONTENT:');
      expect(combinedText).toContain('ATTACHMENT 1:');
    });
  });

  describe('Cache Performance', () => {
    it('should benefit from caching identical content', async () => {
      const emailContent = {
        id: 'cache-test-1',
        subject: 'Identical Content',
        body_text: 'This content will be cached for performance testing.',
      };

      // First vectorization (cache miss)
      const startTime1 = Date.now();
      await vectorizationService.vectorizeEmail(emailContent, { useCache: true });
      const endTime1 = Date.now();
      const firstTime = endTime1 - startTime1;

      // Reset mocks but keep cache
      mockEmbeddingService.generateEmbedding.mockClear();
      mockVectorRepository.saveEmailEmbedding.mockClear();
      mockVectorRepository.isEmailVectorized.mockResolvedValue(false);

      // Second vectorization with same content (cache hit)
      const emailContent2 = {
        id: 'cache-test-2',
        subject: 'Identical Content',
        body_text: 'This content will be cached for performance testing.',
      };

      const startTime2 = Date.now();
      await vectorizationService.vectorizeEmail(emailContent2, { useCache: true });
      const endTime2 = Date.now();
      const secondTime = endTime2 - startTime2;

      // Cache hit should be significantly faster
      expect(secondTime).toBeLessThan(firstTime * 0.8); // At least 20% faster
      expect(mockEmbeddingService.generateEmbedding).not.toHaveBeenCalled(); // Should use cache
    });

    it('should handle cache operations efficiently', () => {
      const numEntries = 1000;
      const testData = Array.from({ length: numEntries }, (_, i) => ({
        text: `Test content ${i}`,
        embedding: new Array(1536).fill(Math.random()),
        textChunks: { chunks: [], totalLength: 100 },
        metadata: { test: true },
      }));

      // Measure cache write performance
      const startTime = Date.now();
      testData.forEach(({ text, embedding, textChunks, metadata }) => {
        vectorizationCache.set(text, embedding, textChunks, metadata);
      });
      const writeTime = Date.now() - startTime;

      // Measure cache read performance
      const readStartTime = Date.now();
      testData.forEach(({ text }) => {
        vectorizationCache.get(text);
      });
      const readTime = Date.now() - readStartTime;

      expect(writeTime).toBeLessThan(1000); // Write 1000 entries in under 1 second
      expect(readTime).toBeLessThan(100); // Read 1000 entries in under 100ms

      const stats = vectorizationCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(numEntries);
      expect(stats.totalHits).toBe(numEntries);
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks during batch processing', async () => {
      const initialMemory = process.memoryUsage();

      // Process a large batch
      const emails = Array.from({ length: 500 }, (_, i) => ({
        id: `memory-test-${i}`,
        subject: `Memory Test ${i}`,
        body_text: 'Content '.repeat(100), // ~800 bytes per email
      }));

      await vectorizationService.batchVectorizeEmails(emails, {
        batchSize: 50,
      });

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 100MB for 500 emails)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors without significant performance impact', async () => {
      // Create mix of successful and failing emails
      const emails = Array.from({ length: 50 }, (_, i) => ({
        id: `error-test-${i}`,
        subject: `Test ${i}`,
        body_text: i % 5 === 0 ? '' : `Content ${i}`, // Every 5th email has empty content
      }));

      // Mock some failures
      mockVectorRepository.saveEmailEmbedding.mockImplementation((id: string) => {
        if (id.includes('0') || id.includes('5')) {
          return Promise.reject(new Error('Database error'));
        }
        return Promise.resolve();
      });

      const startTime = Date.now();
      const result = await vectorizationService.batchVectorizeEmails(emails);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      
      // Should complete in reasonable time despite errors
      expect(processingTime).toBeLessThan(10000); // Under 10 seconds
      expect(result.errorCount).toBeGreaterThan(0);
      expect(result.processedCount).toBeGreaterThan(0);
    });
  });
});