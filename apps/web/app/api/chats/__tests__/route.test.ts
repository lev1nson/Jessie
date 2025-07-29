import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock dependencies
const mockGetUser = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseInsert = vi.fn();
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

// Mock security module - always allow in tests
vi.mock('@/lib/security', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 })),
  getClientIP: vi.fn(() => '192.168.1.1'),
}));

describe('/api/chats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks with proper chainable structure
    mockSupabaseFrom.mockImplementation(() => {
      const chainable = {
        select: vi.fn(() => chainable),
        insert: vi.fn(() => chainable),
        eq: vi.fn(() => chainable),
        order: vi.fn(() => chainable),
        single: vi.fn(() => chainable),
      };
      
      // Set the actual mocks on the chainable object
      chainable.select = mockSupabaseSelect.mockReturnValue(chainable);
      chainable.insert = mockSupabaseInsert.mockReturnValue(chainable);
      
      return chainable;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user chats successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockChats = [
        {
          id: 'chat-1',
          title: 'Chat 1',
          created_at: '2023-07-27T12:00:00Z',
          messages: [{ content: 'Hello' }],
        },
        {
          id: 'chat-2',
          title: 'Chat 2',
          created_at: '2023-07-27T11:00:00Z',
          messages: [],
        },
      ];

      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      
      // Mock the chainable calls for GET
      const chainable = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockChats, error: null }),
      };
      mockSupabaseFrom.mockReturnValue(chainable);

      const request = new NextRequest('http://localhost:3000/api/chats', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.chats).toHaveLength(2);
      expect(data.chats[0]).toMatchObject({
        id: 'chat-1',
        title: 'Chat 1',
        lastMessage: 'Hello',
        isActive: true,
      });
      expect(data.chats[1]).toMatchObject({
        id: 'chat-2',
        title: 'Chat 2',
        lastMessage: '',
        isActive: true,
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const request = new NextRequest('http://localhost:3000/api/chats', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle database errors', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      
      // Mock the chainable calls for GET with error
      const chainable = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      };
      mockSupabaseFrom.mockReturnValue(chainable);

      const request = new NextRequest('http://localhost:3000/api/chats', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch chats');
    });

    it('should return 429 when rate limited', async () => {
      const { checkRateLimit } = await import('@/lib/security');
      vi.mocked(checkRateLimit).mockReturnValueOnce({ 
        allowed: false, 
        remaining: 0, 
        resetTime: Date.now() + 60000 
      });

      const request = new NextRequest('http://localhost:3000/api/chats', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
    });
  });

  describe('POST', () => {
    it('should create a new chat successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockChat = {
        id: 'chat-123',
        user_id: 'user-123',
        title: 'New Chat',
        created_at: '2023-07-27T12:00:00Z',
      };

      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      
      // Mock multiple from() calls for different operations
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          };
        } else if (table === 'chats') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockChat, error: null }),
          };
        }
      });

      const request = new NextRequest('http://localhost:3000/api/chats', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Chat',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.chat).toMatchObject({
        id: 'chat-123',
        title: 'New Chat',
        lastMessage: '',
        isActive: true,
      });
    });

    it('should create a chat with auto-generated title from first message', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockChat = {
        id: 'chat-123',
        user_id: 'user-123',
        title: 'This is a long first message that should be trunca',
        created_at: '2023-07-27T12:00:00Z',
      };

      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      
      // Mock multiple from() calls for different operations
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          };
        } else if (table === 'chats') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockChat, error: null }),
          };
        }
      });

      const request = new NextRequest('http://localhost:3000/api/chats', {
        method: 'POST',
        body: JSON.stringify({
          firstMessage: 'This is a long first message that should be truncated for the title',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.chat.title).toBe('This is a long first message that should be trunca');
    });

    it('should create a chat with default title when no title or firstMessage provided', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockChat = {
        id: 'chat-123',
        user_id: 'user-123',
        title: 'New Chat',
        created_at: '2023-07-27T12:00:00Z',
      };

      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      
      // Mock multiple from() calls for different operations
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          };
        } else if (table === 'chats') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockChat, error: null }),
          };
        }
      });

      const request = new NextRequest('http://localhost:3000/api/chats', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.chat.title).toBe('New Chat');
    });

    it('should return 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const request = new NextRequest('http://localhost:3000/api/chats', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Chat',
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

    it('should return 400 for invalid request data', async () => {
      const request = new NextRequest('http://localhost:3000/api/chats', {
        method: 'POST',
        body: JSON.stringify({
          title: '', // Empty title should fail validation
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

    it('should handle database errors during chat creation', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      
      // Mock multiple from() calls - users success, chats error
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          };
        } else if (table === 'chats') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
          };
        }
      });

      const request = new NextRequest('http://localhost:3000/api/chats', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Chat',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create chat');
    });
  });
});