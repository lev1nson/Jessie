import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock dependencies
const mockGetUser = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseInsert = vi.fn();
// const mockSupabaseUpdate = vi.fn();
const mockSupabaseFrom = vi.fn();

// Mock Supabase
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockSupabaseFrom,
  })),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-cookie' })),
  })),
}));

// Mock security module
vi.mock('@/lib/security', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 19, resetTime: Date.now() + 60000 })),
  getClientIP: vi.fn(() => '192.168.1.1'),
}));

// Mock EmbeddingService
const mockGenerateEmbedding = vi.fn();
vi.mock('@/lib/llm/embeddingService', () => ({
  EmbeddingService: vi.fn(() => ({
    generateEmbedding: mockGenerateEmbedding,
  })),
}));

// Mock VectorRepository
const mockSearchSimilarVectors = vi.fn();
vi.mock('@/lib/repositories/vectorRepository', () => ({
  VectorRepository: vi.fn(() => ({
    searchSimilarVectors: mockSearchSimilarVectors,
  })),
}));

describe('/api/chat/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockSupabaseFrom.mockImplementation((table) => {
      const chainable = {
        select: vi.fn(() => chainable),
        insert: vi.fn(() => chainable),
        update: vi.fn(() => chainable),
        eq: vi.fn(() => chainable),
        single: vi.fn(() => chainable),
      };
      
      // Set specific return values based on table
      if (table === 'chats') {
        chainable.select.mockImplementation(() => ({
          ...chainable,
          eq: vi.fn(() => ({
            ...chainable,
            single: vi.fn(() => mockSupabaseSelect())
          }))
        }));
      }
      
      if (table === 'messages') {
        chainable.insert.mockImplementation(() => ({
          ...chainable,
          select: vi.fn(() => ({
            ...chainable,
            single: vi.fn(() => mockSupabaseInsert())
          }))
        }));
      }
      
      return chainable;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should successfully send a message and return assistant response', async () => {
      // Setup mocks
      const mockUser = { id: '550e8400-e29b-41d4-a716-446655440000', email: 'test@example.com' };
      const mockChat = { id: '550e8400-e29b-41d4-a716-446655440001', user_id: '550e8400-e29b-41d4-a716-446655440000' };
      const mockUserMessage = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        chat_id: '550e8400-e29b-41d4-a716-446655440001',
        role: 'user',
        content: 'Test message',
        created_at: '2023-07-27T12:00:00Z',
      };
      const mockAssistantMessage = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        chat_id: '550e8400-e29b-41d4-a716-446655440001',
        role: 'assistant',
        content: 'Assistant response',
        source_email_ids: ['550e8400-e29b-41d4-a716-446655440004'],
        created_at: '2023-07-27T12:00:01Z',
      };

      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      
      mockSupabaseSelect.mockResolvedValueOnce({ 
        data: mockChat, 
        error: null 
      });
      
      mockSupabaseInsert.mockResolvedValueOnce({
        data: mockUserMessage,
        error: null,
      }).mockResolvedValueOnce({
        data: mockAssistantMessage,
        error: null,
      });

      mockGenerateEmbedding.mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
      });

      mockSearchSimilarVectors.mockResolvedValue([
        {
          id: '550e8400-e29b-41d4-a716-446655440004',
          body_text: 'This is a test email content that should be returned',
          similarity: 0.85,
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          chatId: '550e8400-e29b-41d4-a716-446655440001',
          content: 'Test message',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('assistantMessage');
      expect(data.message.content).toBe('Test message');
      expect(data.assistantMessage.content).toContain('Based on your emails');

      // Verify API calls
      expect(mockGetUser).toHaveBeenCalled();
      expect(mockGenerateEmbedding).toHaveBeenCalledWith({
        text: 'Test message',
      });
      expect(mockSearchSimilarVectors).toHaveBeenCalledWith(
        [0.1, 0.2, 0.3],
        {
          limit: 5,
          threshold: 0.7,
          userId: '550e8400-e29b-41d4-a716-446655440000',
        }
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const request = new NextRequest('http://localhost:3000/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          chatId: '550e8400-e29b-41d4-a716-446655440001',
          content: 'Test message',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when chat does not exist', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabaseSelect.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const request = new NextRequest('http://localhost:3000/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          chatId: '550e8400-e29b-41d4-a716-446655440001',
          content: 'Test message',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Chat not found');
    });

    it('should return 400 for invalid request data', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          chatId: 'invalid-uuid',
          content: '',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should handle vector search errors gracefully', async () => {
      const mockUser = { id: '550e8400-e29b-41d4-a716-446655440000', email: 'test@example.com' };
      const mockChat = { id: '550e8400-e29b-41d4-a716-446655440001', user_id: '550e8400-e29b-41d4-a716-446655440000' };
      const mockUserMessage = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        chat_id: '550e8400-e29b-41d4-a716-446655440001',
        role: 'user',
        content: 'Test message',
        created_at: '2023-07-27T12:00:00Z',
      };
      const mockAssistantMessage = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        chat_id: '550e8400-e29b-41d4-a716-446655440001',
        role: 'assistant',
        content: "I'm sorry, I couldn't find any relevant information in your emails.",
        source_email_ids: null,
        created_at: '2023-07-27T12:00:01Z',
      };

      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabaseSelect.mockResolvedValue({ data: mockChat, error: null });
      mockSupabaseInsert.mockResolvedValueOnce({
        data: mockUserMessage,
        error: null,
      }).mockResolvedValueOnce({
        data: mockAssistantMessage,
        error: null,
      });

      mockGenerateEmbedding.mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
      });

      // Mock search failure
      mockSearchSimilarVectors.mockRejectedValue(new Error('Search failed'));

      const request = new NextRequest('http://localhost:3000/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          chatId: '550e8400-e29b-41d4-a716-446655440001',
          content: 'Test message',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.assistantMessage.content).toBe("I'm sorry, I couldn't find any relevant information in your emails.");
    });

    it('should return 429 when rate limited', async () => {
      // Mock rate limit exceeded
      const { checkRateLimit } = await import('@/lib/security');
      vi.mocked(checkRateLimit).mockReturnValue({ 
        allowed: false, 
        remaining: 0, 
        resetTime: Date.now() + 60000 
      });

      const request = new NextRequest('http://localhost:3000/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          chatId: '550e8400-e29b-41d4-a716-446655440001',
          content: 'Test message',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
    });
  });
});