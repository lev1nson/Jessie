import { describe, it, expect, vi, beforeEach } from 'vitest';
import VectorRepository from '../vectorRepository';
import { createServiceSupabase } from '@jessie/lib';

// Mock the @jessie/lib module
vi.mock('@jessie/lib', () => ({
  createServiceSupabase: vi.fn(),
}));

describe('VectorRepository', () => {
  let vectorRepository: VectorRepository;
  let mockSupabaseClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Supabase client with proper chaining
    const createMockChain = () => ({
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis(),
    });

    mockSupabaseClient = createMockChain();

    (createServiceSupabase as any).mockReturnValue(mockSupabaseClient);
    vectorRepository = new VectorRepository();
  });

  describe('saveEmailEmbedding', () => {
    it('should save email embedding successfully', async () => {
      const emailId = 'test-email-id';
      const embedding = [0.1, 0.2, 0.3];
      const textChunks = { chunks: ['chunk1', 'chunk2'] };
      const metadata = { test: 'data' };

      // Mock the chain: from().update().eq()
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
      
      mockSupabaseClient.from = mockFrom;

      await vectorRepository.saveEmailEmbedding(emailId, embedding, textChunks, metadata);

      expect(mockFrom).toHaveBeenCalledWith('emails');
      expect(mockUpdate).toHaveBeenCalledWith({
        embedding,
        text_chunks: textChunks,
        metadata: { ...metadata },
        vectorized_at: expect.any(String),
      });
      expect(mockEq).toHaveBeenCalledWith('id', emailId);
    });

    it('should throw error when save fails', async () => {
      const emailId = 'test-email-id';
      const embedding = [0.1, 0.2, 0.3];
      const textChunks = { chunks: ['chunk1'] };
      const error = { message: 'Database error' };

      // Mock the chain: from().update().eq()
      const mockEq = vi.fn().mockResolvedValue({ error });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
      
      mockSupabaseClient.from = mockFrom;

      await expect(
        vectorRepository.saveEmailEmbedding(emailId, embedding, textChunks)
      ).rejects.toThrow('Failed to save email embedding: Database error');
    });
  });

  describe('batchSaveEmbeddings', () => {
    it('should save multiple embeddings successfully', async () => {
      const embeddings = [
        { 
          id: 'email-1', 
          embedding: [0.1, 0.2], 
          text_chunks: { chunks: ['chunk1'] },
          metadata: { test: 'data1' }
        },
        { 
          id: 'email-2', 
          embedding: [0.3, 0.4], 
          text_chunks: { chunks: ['chunk2'] },
          metadata: { test: 'data2' }
        },
      ];
      
      // Mock the chain: from().upsert()
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });
      
      mockSupabaseClient.from = mockFrom;

      await vectorRepository.batchSaveEmbeddings(embeddings);

      expect(mockFrom).toHaveBeenCalledWith('emails');
      expect(mockUpsert).toHaveBeenCalledWith(
        embeddings.map(item => ({
          id: item.id,
          embedding: item.embedding,
          text_chunks: item.text_chunks,
          metadata: item.metadata,
          vectorized_at: expect.any(String),
        })),
        { onConflict: 'id' }
      );
    });

    it('should handle empty vectors array', async () => {
      await vectorRepository.batchSaveEmbeddings([]);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should throw error when batch save fails', async () => {
      const embeddings = [
        { 
          id: 'email-1', 
          embedding: [0.1, 0.2], 
          text_chunks: { chunks: ['chunk1'] }
        },
      ];
      const error = new Error('Batch save error');
      
      // Mock the chain: from().upsert()
      const mockUpsert = vi.fn().mockResolvedValue({ error });
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });
      
      mockSupabaseClient.from = mockFrom;

      await expect(vectorRepository.batchSaveEmbeddings(embeddings))
        .rejects.toThrow('Failed to batch save embeddings: Batch save error');
    });
  });

  describe('searchSimilarVectors', () => {
    it('should search similar vectors successfully', async () => {
      const queryEmbedding = [0.1, 0.2, 0.3];
      const mockResults = [
        { id: 'email-1', similarity: 0.9 },
        { id: 'email-2', similarity: 0.8 },
      ];
      
      // Mock the chain: rpc()
      const mockRpc = vi.fn().mockResolvedValue({ data: mockResults, error: null });
      mockSupabaseClient.rpc = mockRpc;

      const results = await vectorRepository.searchSimilarVectors(queryEmbedding);

      expect(mockRpc).toHaveBeenCalledWith('match_emails', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 10,
      });
      expect(results).toEqual(mockResults);
    });

    it('should search with custom options', async () => {
      const queryEmbedding = [0.1, 0.2, 0.3];
      const options = { limit: 5, threshold: 0.8, userId: 'user-123' };
      const mockResults = [{ id: 'email-1', similarity: 0.9 }];
      
      // Mock the chain: rpc().eq()
      const mockEq = vi.fn().mockResolvedValue({ data: mockResults, error: null });
      const mockRpc = vi.fn().mockReturnValue({ eq: mockEq });
      mockSupabaseClient.rpc = mockRpc;

      const results = await vectorRepository.searchSimilarVectors(queryEmbedding, options);

      expect(mockRpc).toHaveBeenCalledWith('match_emails', {
        query_embedding: queryEmbedding,
        match_threshold: 0.8,
        match_count: 5,
      });
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(results).toEqual(mockResults);
    });

    it('should throw error when search fails', async () => {
      const queryEmbedding = [0.1, 0.2, 0.3];
      const error = new Error('Search error');

      // Mock the chain: rpc()
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error });
      mockSupabaseClient.rpc = mockRpc;

      await expect(
        vectorRepository.searchSimilarVectors(queryEmbedding)
      ).rejects.toThrow('Failed to search similar vectors: Search error');
    });
  });

  describe('getEmailsForVectorization', () => {
    it('should get emails that need vectorization', async () => {
      const userId = 'user123';
      const mockEmails = [
        { id: 'email1', body_text: 'Text 1', subject: 'Subject 1' },
        { id: 'email2', body_text: 'Text 2', subject: 'Subject 2' },
      ];

      // Mock the chain: from().select().eq().is().is().limit()
      const mockLimit = vi.fn().mockResolvedValue({ data: mockEmails, error: null });
      const mockIs2 = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockIs1 = vi.fn().mockReturnValue({ is: mockIs2 });
      const mockEq = vi.fn().mockReturnValue({ is: mockIs1 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      
      mockSupabaseClient.from = mockFrom;

      const results = await vectorRepository.getEmailsForVectorization(userId);

      expect(mockFrom).toHaveBeenCalledWith('emails');
      expect(mockSelect).toHaveBeenCalledWith('id, body_text, subject');
      expect(mockEq).toHaveBeenCalledWith('user_id', userId);
      expect(mockIs1).toHaveBeenCalledWith('vectorized_at', null);
      expect(mockIs2).toHaveBeenCalledWith('is_filtered', false);
      expect(mockLimit).toHaveBeenCalledWith(100);
      expect(results).toEqual(mockEmails);
    });

    it('should throw error when getting emails fails', async () => {
      const userId = 'user-123';
      const error = new Error('Database error');
      
      // Mock the chain: from().select().eq().is().is().limit()
      const mockLimit = vi.fn().mockResolvedValue({ data: null, error });
      const mockIs2 = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockIs1 = vi.fn().mockReturnValue({ is: mockIs2 });
      const mockEq = vi.fn().mockReturnValue({ is: mockIs1 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      
      mockSupabaseClient.from = mockFrom;

      await expect(vectorRepository.getEmailsForVectorization(userId))
        .rejects.toThrow('Failed to get emails for vectorization: Database error');
    });
  });

  describe('isEmailVectorized', () => {
    it('should return true when email is vectorized', async () => {
      const emailId = 'email-123';
      
      // Mock chain: from().select().eq().single()
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: { vectorized_at: '2023-01-01T00:00:00Z' }, 
        error: null 
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      
      mockSupabaseClient.from = mockFrom;

      const result = await vectorRepository.isEmailVectorized(emailId);

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('emails');
      expect(mockSelect).toHaveBeenCalledWith('vectorized_at');
      expect(mockEq).toHaveBeenCalledWith('id', emailId);
      expect(mockSingle).toHaveBeenCalled();
    });

    it('should return false when email is not vectorized', async () => {
      const emailId = 'email-123';
      
      // Mock chain: from().select().eq().single()
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: { vectorized_at: null }, 
        error: null 
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      
      mockSupabaseClient.from = mockFrom;

      const result = await vectorRepository.isEmailVectorized(emailId);

      expect(result).toBe(false);
    });

    it('should throw error when query fails', async () => {
      const emailId = 'email-123';
      const error = new Error('Database error');
      
      // Mock chain: from().select().eq().single()
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: null, 
        error 
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      
      mockSupabaseClient.from = mockFrom;

      await expect(vectorRepository.isEmailVectorized(emailId))
        .rejects.toThrow('Failed to check vectorization status: Database error');
    });
  });

  describe('getVectorizationStats', () => {
    it('should return vectorization statistics', async () => {
      const userId = 'user-123';
      
      // Mock total emails query
      const mockTotalSelect = vi.fn().mockResolvedValue({ 
        data: [{ id: '1' }, { id: '2' }, { id: '3' }], 
        error: null 
      });
      const mockTotalEq2 = vi.fn().mockReturnValue({ select: mockTotalSelect });
      const mockTotalEq1 = vi.fn().mockReturnValue({ eq: mockTotalEq2 });
      const mockTotalFrom = vi.fn().mockReturnValue({ eq: mockTotalEq1 });
      
      // Mock vectorized emails query
      const mockVectorizedSelect = vi.fn().mockResolvedValue({ 
        data: [{ id: '1' }], 
        error: null 
      });
      const mockVectorizedNot = vi.fn().mockReturnValue({ select: mockVectorizedSelect });
      const mockVectorizedEq2 = vi.fn().mockReturnValue({ not: mockVectorizedNot });
      const mockVectorizedEq1 = vi.fn().mockReturnValue({ eq: mockVectorizedEq2 });
      const mockVectorizedFrom = vi.fn().mockReturnValue({ eq: mockVectorizedEq1 });

      // Mock client.from to return different mocks for different calls
      mockSupabaseClient.from = vi.fn()
        .mockReturnValueOnce({ eq: mockTotalEq1 })
        .mockReturnValueOnce({ eq: mockVectorizedEq1 });

      const stats = await vectorRepository.getVectorizationStats(userId);

      expect(stats).toEqual({
        total: 3,
        vectorized: 1,
        pending: 2,
      });
      expect(mockTotalSelect).toHaveBeenCalledWith('id', { count: 'exact' });
      expect(mockVectorizedSelect).toHaveBeenCalledWith('id', { count: 'exact' });
    });

    it('should handle zero counts', async () => {
      const userId = 'user-123';

      // Mock total emails query: from().select().eq().eq()
      const mockTotalEq2 = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockTotalEq1 = vi.fn().mockReturnValue({ eq: mockTotalEq2 });
      const mockTotalSelect = vi.fn().mockReturnValue({ eq: mockTotalEq1 });
      const mockTotalFrom = vi.fn().mockReturnValue({ select: mockTotalSelect });
      
      // Mock vectorized emails query: from().select().eq().eq().not()
      const mockVectorizedNot = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockVectorizedEq2 = vi.fn().mockReturnValue({ not: mockVectorizedNot });
      const mockVectorizedEq1 = vi.fn().mockReturnValue({ eq: mockVectorizedEq2 });
      const mockVectorizedSelect = vi.fn().mockReturnValue({ eq: mockVectorizedEq1 });
      const mockVectorizedFrom = vi.fn().mockReturnValue({ select: mockVectorizedSelect });

      mockSupabaseClient.from = vi.fn()
        .mockReturnValueOnce(mockTotalFrom)
        .mockReturnValueOnce(mockVectorizedFrom);

      const stats = await vectorRepository.getVectorizationStats(userId);

      expect(stats).toEqual({
        total: 0,
        vectorized: 0,
        pending: 0,
      });
      expect(mockTotalSelect).toHaveBeenCalledWith('id', { count: 'exact' });
      expect(mockVectorizedSelect).toHaveBeenCalledWith('id', { count: 'exact' });
    });

    it('should throw error when getting total count fails', async () => {
      const userId = 'user-123';
      const error = new Error('Total count error');
      
      // Mock the first query (total count) to fail
      // Chain: from().select().eq().eq()
      const mockTotalEq2 = vi.fn().mockResolvedValue({ data: null, error });
      const mockTotalEq1 = vi.fn().mockReturnValue({ eq: mockTotalEq2 });
      const mockTotalSelect = vi.fn().mockReturnValue({ eq: mockTotalEq1 });
      const mockTotalFrom = vi.fn().mockReturnValue({ select: mockTotalSelect });
      
      // Only mock the first call since it should fail before the second
      mockSupabaseClient.from = vi.fn().mockReturnValue(mockTotalFrom);

      await expect(vectorRepository.getVectorizationStats(userId))
        .rejects.toThrow('Failed to get total emails count: Total count error');
      
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1);
      expect(mockTotalSelect).toHaveBeenCalledWith('id', { count: 'exact' });
    });
  });

  describe('deleteEmailEmbedding', () => {
    it('should delete email embedding successfully', async () => {
      const emailId = 'email-123';
      
      // Mock the chain: from().update().eq()
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
      
      mockSupabaseClient.from = mockFrom;

      await vectorRepository.deleteEmailEmbedding(emailId);

      expect(mockFrom).toHaveBeenCalledWith('emails');
      expect(mockUpdate).toHaveBeenCalledWith({
        embedding: null,
        text_chunks: null,
        vectorized_at: null,
      });
      expect(mockEq).toHaveBeenCalledWith('id', emailId);
    });

    it('should throw error when delete fails', async () => {
      const emailId = 'email-123';
      const error = new Error('Delete error');
      
      // Mock the chain: from().update().eq()
      const mockEq = vi.fn().mockResolvedValue({ error });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
      
      mockSupabaseClient.from = mockFrom;

      await expect(vectorRepository.deleteEmailEmbedding(emailId))
        .rejects.toThrow('Failed to delete email embedding: Delete error');
    });
  });
});