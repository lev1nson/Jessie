import { describe, it, expect, vi, beforeEach } from 'vitest';
import VectorizationService from '../vectorizationService';
import EmbeddingService from '../../llm/embeddingService';
import TextProcessor from '../../llm/textProcessor';
import VectorRepository from '../../repositories/vectorRepository';
import { AttachmentProcessor } from '../../parsers/attachmentProcessor';

// Mock all dependencies
vi.mock('../../llm/embeddingService');
vi.mock('../../llm/textProcessor');
vi.mock('../../repositories/vectorRepository');
vi.mock('../../parsers/attachmentProcessor');

describe('VectorizationService', () => {
  let vectorizationService: VectorizationService;
  let mockEmbeddingService: any;
  let mockTextProcessor: any;
  let mockVectorRepository: any;
  let mockAttachmentProcessor: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mocks
    mockEmbeddingService = {
      generateEmbedding: vi.fn(),
    };

    mockTextProcessor = {
      cleanText: vi.fn(),
      chunkText: vi.fn(),
    };

    mockVectorRepository = {
      isEmailVectorized: vi.fn(),
      saveEmailEmbedding: vi.fn(),
      getEmailsForVectorization: vi.fn(),
      searchSimilarVectors: vi.fn(),
      getVectorizationStats: vi.fn(),
    };

    mockAttachmentProcessor = {};

    // Mock constructors
    (EmbeddingService as any).mockImplementation(() => mockEmbeddingService);
    (TextProcessor as any).mockImplementation(() => mockTextProcessor);
    (VectorRepository as any).mockImplementation(() => mockVectorRepository);
    (AttachmentProcessor as any).mockImplementation(() => mockAttachmentProcessor);

    vectorizationService = new VectorizationService();
  });

  describe('vectorizeEmail', () => {
    const mockEmailContent = {
      id: 'email123',
      subject: 'Test Subject',
      body_text: 'Test body content',
    };

    it('should vectorize email successfully', async () => {
      const mockEmbeddingResponse = {
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
      };

      mockVectorRepository.isEmailVectorized.mockResolvedValue(false);
      mockTextProcessor.cleanText.mockReturnValue('Cleaned text');
      mockTextProcessor.chunkText.mockReturnValue([
        { content: 'Chunk 1', index: 0 },
        { content: 'Chunk 2', index: 1 },
      ]);
      mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbeddingResponse);
      mockVectorRepository.saveEmailEmbedding.mockResolvedValue(undefined);

      await vectorizationService.vectorizeEmail(mockEmailContent);

      expect(mockVectorRepository.isEmailVectorized).toHaveBeenCalledWith('email123');
      expect(mockTextProcessor.cleanText).toHaveBeenCalled();
      expect(mockTextProcessor.chunkText).toHaveBeenCalled();
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith({
        text: 'Chunk 1',
      });
      expect(mockVectorRepository.saveEmailEmbedding).toHaveBeenCalledWith(
        'email123',
        [0.1, 0.2, 0.3],
        expect.objectContaining({
          chunks: expect.any(Array),
          totalLength: expect.any(Number),
          chunkCount: 2,
        }),
        expect.objectContaining({
          hasAttachments: false,
          attachmentCount: 0,
        })
      );
    });

    it('should skip already vectorized email', async () => {
      mockVectorRepository.isEmailVectorized.mockResolvedValue(true);

      await vectorizationService.vectorizeEmail(mockEmailContent);

      expect(mockVectorRepository.isEmailVectorized).toHaveBeenCalledWith('email123');
      expect(mockTextProcessor.cleanText).not.toHaveBeenCalled();
      expect(mockEmbeddingService.generateEmbedding).not.toHaveBeenCalled();
      expect(mockVectorRepository.saveEmailEmbedding).not.toHaveBeenCalled();
    });

    it('should handle email with attachments', async () => {
      const emailWithAttachments = {
        ...mockEmailContent,
        attachments: [
          {
            id: 'att1',
            filename: 'test.pdf',
            mime_type: 'application/pdf',
            content_text: 'PDF content',
          },
        ],
      };

      const mockEmbeddingResponse = {
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
      };

      mockVectorRepository.isEmailVectorized.mockResolvedValue(false);
      mockTextProcessor.cleanText.mockReturnValue('Cleaned text with attachments');
      mockTextProcessor.chunkText.mockReturnValue([
        { content: 'Chunk with attachment', index: 0 },
      ]);
      mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbeddingResponse);
      mockVectorRepository.saveEmailEmbedding.mockResolvedValue(undefined);

      await vectorizationService.vectorizeEmail(emailWithAttachments);

      expect(mockVectorRepository.saveEmailEmbedding).toHaveBeenCalledWith(
        'email123',
        [0.1, 0.2, 0.3],
        expect.any(Object),
        expect.objectContaining({
          hasAttachments: true,
          attachmentCount: 1,
        })
      );
    });

    it('should throw error when vectorization fails', async () => {
      mockVectorRepository.isEmailVectorized.mockResolvedValue(false);
      mockTextProcessor.cleanText.mockReturnValue('Cleaned text');
      mockTextProcessor.chunkText.mockReturnValue([]);
      mockEmbeddingService.generateEmbedding.mockRejectedValue(new Error('API error'));

      await expect(
        vectorizationService.vectorizeEmail(mockEmailContent)
      ).rejects.toThrow('Failed to vectorize email email123: API error');
    });
  });

  describe('batchVectorizeEmails', () => {
    const mockEmails = [
      {
        id: 'email1',
        subject: 'Subject 1',
        body_text: 'Body 1',
      },
      {
        id: 'email2',
        subject: 'Subject 2',
        body_text: 'Body 2',
      },
    ];

    it('should batch vectorize emails successfully', async () => {
      const mockEmbeddingResponse = {
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
      };

      mockVectorRepository.isEmailVectorized.mockResolvedValue(false);
      mockTextProcessor.cleanText.mockReturnValue('Cleaned text');
      mockTextProcessor.chunkText.mockReturnValue([
        { content: 'Chunk', index: 0 },
      ]);
      mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbeddingResponse);
      mockVectorRepository.saveEmailEmbedding.mockResolvedValue(undefined);

      const result = await vectorizationService.batchVectorizeEmails(mockEmails);

      expect(result).toEqual({
        success: true,
        processedCount: 2,
        errorCount: 0,
        errors: [],
      });
    });

    it('should handle partial failures in batch', async () => {
      const mockEmbeddingResponse = {
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
      };

      mockVectorRepository.isEmailVectorized.mockResolvedValue(false);
      mockTextProcessor.cleanText.mockReturnValue('Cleaned text');
      mockTextProcessor.chunkText.mockReturnValue([
        { content: 'Chunk', index: 0 },
      ]);
      
      // First email succeeds, second fails
      mockEmbeddingService.generateEmbedding
        .mockResolvedValueOnce(mockEmbeddingResponse)
        .mockRejectedValueOnce(new Error('API error'));
      
      mockVectorRepository.saveEmailEmbedding.mockResolvedValue(undefined);

      const result = await vectorizationService.batchVectorizeEmails(mockEmails);

      expect(result).toEqual({
        success: false,
        processedCount: 1,
        errorCount: 1,
        errors: [
          {
            emailId: 'email2',
            error: 'Failed to vectorize email email2: API error',
          },
        ],
      });
    });

    it('should process emails in batches', async () => {
      const largeEmailList = Array.from({ length: 25 }, (_, i) => ({
        id: `email${i}`,
        subject: `Subject ${i}`,
        body_text: `Body ${i}`,
      }));

      const mockEmbeddingResponse = {
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
      };

      mockVectorRepository.isEmailVectorized.mockResolvedValue(false);
      mockTextProcessor.cleanText.mockReturnValue('Cleaned text');
      mockTextProcessor.chunkText.mockReturnValue([
        { content: 'Chunk', index: 0 },
      ]);
      mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbeddingResponse);
      mockVectorRepository.saveEmailEmbedding.mockResolvedValue(undefined);

      const result = await vectorizationService.batchVectorizeEmails(
        largeEmailList,
        { batchSize: 10 }
      );

      expect(result.processedCount).toBe(25);
      expect(result.success).toBe(true);
    });
  });

  describe('vectorizeUserEmails', () => {
    it('should vectorize user emails successfully', async () => {
      const userId = 'user123';
      const mockEmails = [
        { id: 'email1', body_text: 'Body 1', subject: 'Subject 1' },
        { id: 'email2', body_text: 'Body 2', subject: 'Subject 2' },
      ];

      const mockEmbeddingResponse = {
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
      };

      mockVectorRepository.getEmailsForVectorization.mockResolvedValue(mockEmails);
      mockVectorRepository.isEmailVectorized.mockResolvedValue(false);
      mockTextProcessor.cleanText.mockReturnValue('Cleaned text');
      mockTextProcessor.chunkText.mockReturnValue([
        { content: 'Chunk', index: 0 },
      ]);
      mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbeddingResponse);
      mockVectorRepository.saveEmailEmbedding.mockResolvedValue(undefined);

      const result = await vectorizationService.vectorizeUserEmails(userId);

      expect(mockVectorRepository.getEmailsForVectorization).toHaveBeenCalledWith(
        userId,
        100
      );
      expect(result.processedCount).toBe(2);
      expect(result.success).toBe(true);
    });

    it('should handle no emails to vectorize', async () => {
      const userId = 'user123';

      mockVectorRepository.getEmailsForVectorization.mockResolvedValue([]);

      const result = await vectorizationService.vectorizeUserEmails(userId);

      expect(result).toEqual({
        success: true,
        processedCount: 0,
        errorCount: 0,
        errors: [],
      });
    });

    it('should throw error when getting emails fails', async () => {
      const userId = 'user123';

      mockVectorRepository.getEmailsForVectorization.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        vectorizationService.vectorizeUserEmails(userId)
      ).rejects.toThrow('Failed to vectorize user emails: Database error');
    });
  });

  describe('searchSimilarEmails', () => {
    it('should search similar emails successfully', async () => {
      const query = 'test query';
      const userId = 'user123';
      const mockResults = [
        { id: 'email1', similarity: 0.9 },
        { id: 'email2', similarity: 0.8 },
      ];

      const mockEmbeddingResponse = {
        embedding: [0.1, 0.2, 0.3],
        tokens: 5,
      };

      mockTextProcessor.cleanText.mockReturnValue('cleaned query');
      mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbeddingResponse);
      mockVectorRepository.searchSimilarVectors.mockResolvedValue(mockResults);

      const results = await vectorizationService.searchSimilarEmails(
        query,
        userId,
        { limit: 5, threshold: 0.8 }
      );

      expect(mockTextProcessor.cleanText).toHaveBeenCalledWith(query);
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith({
        text: 'cleaned query',
      });
      expect(mockVectorRepository.searchSimilarVectors).toHaveBeenCalledWith(
        [0.1, 0.2, 0.3],
        {
          limit: 5,
          threshold: 0.8,
          userId,
        }
      );
      expect(results).toEqual(mockResults);
    });

    it('should use default options when not provided', async () => {
      const query = 'test query';
      const mockEmbeddingResponse = {
        embedding: [0.1, 0.2, 0.3],
        tokens: 5,
      };

      mockTextProcessor.cleanText.mockReturnValue('cleaned query');
      mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbeddingResponse);
      mockVectorRepository.searchSimilarVectors.mockResolvedValue([]);

      await vectorizationService.searchSimilarEmails(query);

      expect(mockVectorRepository.searchSimilarVectors).toHaveBeenCalledWith(
        [0.1, 0.2, 0.3],
        {
          limit: 10,
          threshold: 0.7,
          userId: undefined,
        }
      );
    });

    it('should throw error when search fails', async () => {
      const query = 'test query';

      mockTextProcessor.cleanText.mockReturnValue('cleaned query');
      mockEmbeddingService.generateEmbedding.mockRejectedValue(
        new Error('Embedding error')
      );

      await expect(
        vectorizationService.searchSimilarEmails(query)
      ).rejects.toThrow('Failed to search similar emails: Embedding error');
    });
  });

  describe('getVectorizationStats', () => {
    it('should get vectorization statistics', async () => {
      const userId = 'user123';
      const mockStats = {
        total: 100,
        vectorized: 60,
        pending: 40,
      };

      mockVectorRepository.getVectorizationStats.mockResolvedValue(mockStats);

      const stats = await vectorizationService.getVectorizationStats(userId);

      expect(mockVectorRepository.getVectorizationStats).toHaveBeenCalledWith(userId);
      expect(stats).toEqual(mockStats);
    });
  });

  describe('combineEmailText', () => {
    it('should combine subject and body text', () => {
      const emailContent = {
        id: 'email123',
        subject: 'Test Subject',
        body_text: 'Test body content',
      };

      // Access private method through any cast for testing
      const result = (vectorizationService as any).combineEmailText(emailContent);

      expect(result).toBe('Subject: Test Subject\n\nBody: Test body content');
    });

    it('should handle missing subject', () => {
      const emailContent = {
        id: 'email123',
        subject: '',
        body_text: 'Test body content',
      };

      const result = (vectorizationService as any).combineEmailText(emailContent);

      expect(result).toBe('Body: Test body content');
    });

    it('should handle missing body', () => {
      const emailContent = {
        id: 'email123',
        subject: 'Test Subject',
        body_text: '',
      };

      const result = (vectorizationService as any).combineEmailText(emailContent);

      expect(result).toBe('Subject: Test Subject');
    });

    it('should handle empty content', () => {
      const emailContent = {
        id: 'email123',
        subject: '',
        body_text: '',
      };

      const result = (vectorizationService as any).combineEmailText(emailContent);

      expect(result).toBe('');
    });
  });
});