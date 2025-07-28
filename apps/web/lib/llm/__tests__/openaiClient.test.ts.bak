import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import OpenAIClient from '../openaiClient';

describe('OpenAIClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset the singleton instance
    (OpenAIClient as any).instance = null;
    // Mock environment variable
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
    (OpenAIClient as any).instance = null;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = OpenAIClient.getInstance();
      const instance2 = OpenAIClient.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(OpenAIClient);
    });

    it('should throw error when OPENAI_API_KEY is not set', () => {
      delete process.env.OPENAI_API_KEY;
      
      expect(() => OpenAIClient.getInstance()).toThrow(
        'OPENAI_API_KEY environment variable is required'
      );
    });
  });

  describe('getClient', () => {
    it('should return OpenAI client instance', () => {
      const openaiClient = OpenAIClient.getInstance();
      const client = openaiClient.getClient();
      
      expect(client).toBeDefined();
      expect(typeof client.embeddings.create).toBe('function');
    });
  });

  describe('testConnection', () => {
    it('should test connection to OpenAI API', async () => {
      const openaiClient = OpenAIClient.getInstance();
      
      // Mock the models.list method
      const mockList = vi.fn().mockResolvedValue({
        data: [{ id: 'gpt-3.5-turbo' }]
      });
      
      openaiClient.getClient().models.list = mockList;
      
      const result = await openaiClient.testConnection();
      
      expect(result).toBe(true);
      expect(mockList).toHaveBeenCalled();
    });

    it('should return false on connection error', async () => {
      const openaiClient = OpenAIClient.getInstance();
      
      // Mock the models.list method to throw error
      const mockList = vi.fn().mockRejectedValue(new Error('API Error'));
      openaiClient.getClient().models.list = mockList;
      
      const result = await openaiClient.testConnection();
      
      expect(result).toBe(false);
    });
  });
});