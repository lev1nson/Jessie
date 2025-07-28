import { describe, it, expect, beforeEach, vi } from 'vitest';
import VectorizationService from '../services/vectorizationService';
import TextProcessor from '../llm/textProcessor';

// Mock external dependencies
vi.mock('../llm/embeddingService');
vi.mock('../repositories/vectorRepository');
vi.mock('../parsers/attachmentProcessor');

describe('Vectorization Integration Tests', () => {
  let vectorizationService: VectorizationService;
  let mockEmbeddingService: any;
  let mockVectorRepository: any;
  let mockAttachmentProcessor: any;
  let textProcessor: TextProcessor;

  beforeEach(() => {
    // Create mocks
    mockEmbeddingService = {
      generateEmbedding: vi.fn(),
      generateBatchEmbeddings: vi.fn(),
    };

    mockVectorRepository = {
      isEmailVectorized: vi.fn(),
      saveEmailEmbedding: vi.fn(),
      batchSaveEmbeddings: vi.fn(),
      getEmailsForVectorization: vi.fn(),
      searchSimilarVectors: vi.fn(),
      getVectorizationStats: vi.fn(),
    };

    mockAttachmentProcessor = {
      processAttachments: vi.fn(),
      detectSupportedAttachments: vi.fn(),
    };

    // Use real TextProcessor for integration testing
    textProcessor = new TextProcessor();

    // Create service with mocked dependencies
    vectorizationService = new VectorizationService(
      mockEmbeddingService,
      textProcessor,
      mockVectorRepository,
      mockAttachmentProcessor
    );
  });

  describe('Full Vectorization Pipeline', () => {
    it('should vectorize email with text content only', async () => {
      const emailContent = {
        id: 'email-123',
        subject: 'Test Email Subject',
        body_text: 'This is the body of the test email with important content.',
      };

      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      // Setup mocks
      mockVectorRepository.isEmailVectorized.mockResolvedValue(false);
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        embedding: mockEmbedding,
        tokens: 15,
      });
      mockVectorRepository.saveEmailEmbedding.mockResolvedValue(undefined);

      // Execute vectorization
      await vectorizationService.vectorizeEmail(emailContent);

      // Verify the flow
      expect(mockVectorRepository.isEmailVectorized).toHaveBeenCalledWith('email-123');
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith({
        text: expect.stringContaining('Subject: Test Email Subject'),
      });
      expect(mockVectorRepository.saveEmailEmbedding).toHaveBeenCalledWith(
        'email-123',
        mockEmbedding,
        expect.objectContaining({
          chunks: expect.any(Array),
          totalLength: expect.any(Number),
          chunkCount: expect.any(Number),
        }),
        expect.objectContaining({
          hasAttachments: false,
          attachmentCount: 0,
        })
      );
    });

    it('should vectorize email with attachments', async () => {
      const emailContent = {
        id: 'email-with-attachments',
        subject: 'Email with Attachments',
        body_text: 'Please find the documents attached.',
        attachments: [
          {
            id: 'attachment-1',
            filename: 'document.pdf',
            mime_type: 'application/pdf',
            content_text: 'This is the content of the PDF document.',
          },
        ],
      };

      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      // Setup mocks
      mockVectorRepository.isEmailVectorized.mockResolvedValue(false);
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        embedding: mockEmbedding,
        tokens: 25,
      });
      mockVectorRepository.saveEmailEmbedding.mockResolvedValue(undefined);

      // Execute vectorization
      await vectorizationService.vectorizeEmail(emailContent);

      // Verify that embedding was generated with attachment content
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith({
        text: expect.stringContaining('document.pdf: This is the content of the PDF document'),
      });

      // Verify metadata includes attachment info
      expect(mockVectorRepository.saveEmailEmbedding).toHaveBeenCalledWith(
        'email-with-attachments',
        mockEmbedding,
        expect.any(Object),
        expect.objectContaining({
          hasAttachments: true,
          attachmentCount: 1,
        })
      );
    });

    it('should skip already vectorized emails', async () => {
      const emailContent = {
        id: 'already-vectorized',
        subject: 'Already Processed',
        body_text: 'This email was already processed.',
      };

      // Mock that email is already vectorized
      mockVectorRepository.isEmailVectorized.mockResolvedValue(true);

      // Execute vectorization
      await vectorizationService.vectorizeEmail(emailContent);

      // Verify early return
      expect(mockVectorRepository.isEmailVectorized).toHaveBeenCalledWith('already-vectorized');
      expect(mockEmbeddingService.generateEmbedding).not.toHaveBeenCalled();
      expect(mockVectorRepository.saveEmailEmbedding).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const emailContent = {
        id: 'error-email',
        subject: 'Error Test',
        body_text: 'This will cause an error.',
      };

      // Setup error scenario
      mockVectorRepository.isEmailVectorized.mockResolvedValue(false);
      mockEmbeddingService.generateEmbedding.mockRejectedValue(
        new Error('OpenAI API error')
      );

      // Execute and expect error
      await expect(vectorizationService.vectorizeEmail(emailContent))
        .rejects.toThrow('Failed to vectorize email error-email: OpenAI API error');
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple emails in batch', async () => {
      const emails = [
        {
          id: 'batch-1',
          subject: 'First Email',
          body_text: 'First email content',
        },
        {
          id: 'batch-2',
          subject: 'Second Email',
          body_text: 'Second email content',
        },
      ];

      const mockEmbedding = [0.1, 0.2, 0.3];

      // Setup mocks for successful processing
      mockVectorRepository.isEmailVectorized.mockResolvedValue(false);
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        embedding: mockEmbedding,
        tokens: 10,
      });
      mockVectorRepository.saveEmailEmbedding.mockResolvedValue(undefined);

      // Execute batch processing
      const result = await vectorizationService.batchVectorizeEmails(emails);

      // Verify results
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify each email was processed
      expect(mockVectorRepository.saveEmailEmbedding).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed success/failure in batch', async () => {
      const emails = [
        {
          id: 'success-email',
          subject: 'Success',
          body_text: 'This will succeed',
        },
        {
          id: 'error-email',
          subject: 'Error',
          body_text: 'This will fail',
        },
      ];

      const mockEmbedding = [0.1, 0.2, 0.3];

      // Setup mixed scenario
      mockVectorRepository.isEmailVectorized.mockResolvedValue(false);
      mockEmbeddingService.generateEmbedding
        .mockResolvedValueOnce({
          embedding: mockEmbedding,
          tokens: 10,
        })
        .mockRejectedValueOnce(new Error('API error'));
      mockVectorRepository.saveEmailEmbedding.mockResolvedValue(undefined);

      // Execute batch processing
      const result = await vectorizationService.batchVectorizeEmails(emails);

      // Verify mixed results
      expect(result.success).toBe(false);
      expect(result.processedCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].emailId).toBe('error-email');
    });
  });

  describe('Search Integration', () => {
    it('should search for similar emails', async () => {
      const query = 'Find emails about project updates';
      const userId = 'user-123';
      const mockQueryEmbedding = [0.5, 0.4, 0.3, 0.2, 0.1];
      const mockSearchResults = [
        {
          id: 'result-1',
          similarity: 0.95,
          metadata: { subject: 'Project Update #1' },
        },
      ];

      // Setup mocks
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        embedding: mockQueryEmbedding,
        tokens: 8,
      });
      mockVectorRepository.searchSimilarVectors.mockResolvedValue(mockSearchResults);

      // Execute search
      const results = await vectorizationService.searchSimilarEmails(query, userId);

      // Verify search flow
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith({
        text: 'Find emails about project updates',
      });
      expect(mockVectorRepository.searchSimilarVectors).toHaveBeenCalledWith(
        mockQueryEmbedding,
        {
          limit: 10,
          threshold: 0.7,
          userId: 'user-123',
        }
      );
      expect(results).toEqual(mockSearchResults);
    });
  });

  describe('Text Processing Integration', () => {
    it('should properly clean and chunk large text content', async () => {
      // Create a large email content
      const largeContent = 'A'.repeat(10000); // 10k characters
      const emailContent = {
        id: 'large-email',
        subject: 'Large Email',
        body_text: largeContent,
      };

      const mockEmbedding = [0.1, 0.2, 0.3];

      // Setup mocks
      mockVectorRepository.isEmailVectorized.mockResolvedValue(false);
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        embedding: mockEmbedding,
        tokens: 100,
      });
      mockVectorRepository.saveEmailEmbedding.mockResolvedValue(undefined);

      // Execute vectorization
      await vectorizationService.vectorizeEmail(emailContent);

      // Verify that chunking occurred
      const saveCall = mockVectorRepository.saveEmailEmbedding.mock.calls[0];
      const textChunks = saveCall[2]; // Third parameter is textChunks

      expect(textChunks.chunks).toBeDefined();
      expect(textChunks.chunks.length).toBeGreaterThan(1); // Should be split into multiple chunks
      expect(textChunks.totalLength).toBe(largeContent.length + 'Subject: Large Email\n\nBody: '.length);
    });

    it('should handle special characters and encoding', async () => {
      const emailContent = {
        id: 'special-chars',
        subject: 'Тест с русскими символами',
        body_text: 'Содержимое письма с эмодзи 😊 и специальными символами: @#$%^&*()',
      };

      const mockEmbedding = [0.1, 0.2, 0.3];

      // Setup mocks
      mockVectorRepository.isEmailVectorized.mockResolvedValue(false);
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        embedding: mockEmbedding,
        tokens: 20,
      });
      mockVectorRepository.saveEmailEmbedding.mockResolvedValue(undefined);

      // Execute vectorization (should not throw)
      await expect(vectorizationService.vectorizeEmail(emailContent))
        .resolves.not.toThrow();

      // Verify processing occurred
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalled();
      expect(mockVectorRepository.saveEmailEmbedding).toHaveBeenCalled();
    });
  });
});