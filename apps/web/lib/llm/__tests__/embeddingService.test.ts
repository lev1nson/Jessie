import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EmbeddingService from '../embeddingService';
import OpenAIClient from '../openaiClient';

// Mock OpenAI client
vi.mock('../openaiClient');

describe('EmbeddingService', () => {
  let embeddingService: EmbeddingService;
  let mockOpenAIClient: any;
  const originalEnv = process.env;

  beforeEach(() => {
    // Mock environment variable
    process.env.OPENAI_API_KEY = 'test-api-key';
    
    // Reset singleton
    (OpenAIClient as any).instance = null;
    
    // Create mock OpenAI client
    mockOpenAIClient = {
      getClient: vi.fn().mockReturnValue({
        embeddings: {
          create: vi.fn()
        },
        models: {
          list: vi.fn()
        }
      })
    };
    
    vi.mocked(OpenAIClient.getInstance).mockReturnValue(mockOpenAIClient);
    
    embeddingService = new EmbeddingService();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for valid text', async () => {
      const mockResponse = {
        data: [{ embedding: [0.1, 0.2, 0.3] }],
        usage: { total_tokens: 5 }
      };
      
      const mockCreate = mockOpenAIClient.getClient().embeddings.create;
      mockCreate.mockResolvedValue(mockResponse);
      
      const result = await embeddingService.generateEmbedding({ text: 'test text' });
      
      expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
      expect(result.tokens).toBe(5);
      
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test text'
      });
    });

    it('should throw error for empty text', async () => {
      await expect(embeddingService.generateEmbedding({ text: '' })).rejects.toThrow('Text cannot be empty');
    });

    it('should handle API errors', async () => {
      const mockCreate = mockOpenAIClient.getClient().embeddings.create;
      mockCreate.mockRejectedValue(new Error('API Error'));
      
      await expect(embeddingService.generateEmbedding({ text: 'test' })).rejects.toThrow('API Error');
    });
  });

  describe('generateBatchEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const mockResponse = {
        data: [
          { embedding: [0.1, 0.2, 0.3] },
          { embedding: [0.4, 0.5, 0.6] }
        ],
        usage: { total_tokens: 10 }
      };
      
      const mockCreate = mockOpenAIClient.getClient().embeddings.create;
      mockCreate.mockResolvedValue(mockResponse);
      
      const result = await embeddingService.generateBatchEmbeddings({ texts: ['text1', 'text2'] });
      
      expect(result.embeddings).toHaveLength(2);
      expect(result.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
      expect(result.embeddings[1]).toEqual([0.4, 0.5, 0.6]);
      expect(result.totalTokens).toBe(10);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: ['text1', 'text2']
      });
    });

    it('should handle empty array', async () => {
      await expect(embeddingService.generateBatchEmbeddings({ texts: [] })).rejects.toThrow('Texts array cannot be empty');
    });

    it('should throw error for batch size exceeding limit', async () => {
      const largeTexts = Array(101).fill('text');
      
      await expect(embeddingService.generateBatchEmbeddings({ texts: largeTexts }))
        .rejects.toThrow('Batch size cannot exceed 100');
    });

    it('should filter out empty texts', async () => {
      const mockResponse = {
        data: [{ embedding: [0.1, 0.2, 0.3] }],
        usage: { total_tokens: 10 }
      };
      
      const mockCreate = mockOpenAIClient.getClient().embeddings.create;
      mockCreate.mockResolvedValue(mockResponse);

      await embeddingService.generateBatchEmbeddings({ 
        texts: ['valid text', '', '   ', 'another valid'] 
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: ['valid text', 'another valid']
      });
    });
  });

  describe('processLargeTextArray', () => {
    it('should process large arrays in batches', async () => {
      const texts = Array(150).fill('test text');
      
      // Mock response for first batch (100 items)
      const mockResponse1 = {
        data: Array(100).fill({ embedding: [0.1, 0.2, 0.3] }),
        usage: { total_tokens: 10 }
      };
      
      // Mock response for second batch (50 items)
      const mockResponse2 = {
        data: Array(50).fill({ embedding: [0.1, 0.2, 0.3] }),
        usage: { total_tokens: 10 }
      };
      
      const mockCreate = mockOpenAIClient.getClient().embeddings.create;
      mockCreate
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);
      
      const result = await embeddingService.processLargeTextArray(texts);
      
      expect(mockCreate).toHaveBeenCalledTimes(2); // 100 + 50
      expect(result.embeddings).toHaveLength(150);
      expect(result.totalTokens).toBe(20); // 10 * 2 batches
    });
  });
});