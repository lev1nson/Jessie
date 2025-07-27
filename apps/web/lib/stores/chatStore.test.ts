import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useChatStore } from './chatStore';
import { Chat, Message } from '../types/chat';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('chatStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const state = useChatStore.getState();
      
      expect(state.chats).toEqual([]);
      expect(state.currentChat).toBeNull();
      expect(state.messages).toEqual([]);
      expect(state.loading).toEqual({
        chats: false,
        messages: false,
        sending: false,
      });
      expect(state.error).toEqual({
        chats: null,
        messages: null,
        sending: null,
      });
    });
  });

  describe('loadChats', () => {
    it('loads chats successfully', async () => {
      const mockChats: Chat[] = [
        {
          id: '1',
          userId: 'user1',
          title: 'Test Chat',
          createdAt: '2023-01-01T12:00:00Z' as any,
          updatedAt: '2023-01-01T12:00:00Z' as any,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ chats: mockChats }),
      });

      const store = useChatStore.getState();
      await store.loadChats();

      const state = useChatStore.getState();
      expect(state.chats).toHaveLength(1);
      expect(state.chats[0].title).toBe('Test Chat');
      expect(state.loading.chats).toBe(false);
      expect(state.error.chats).toBeNull();
    });

    it('handles load chats error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const store = useChatStore.getState();
      await store.loadChats();

      const state = useChatStore.getState();
      expect(state.chats).toEqual([]);
      expect(state.loading.chats).toBe(false);
      expect(state.error.chats).toBe('Failed to load chats');
    });

    it('sets loading state during fetch', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ chats: [] }),
        }), 100))
      );

      const store = useChatStore.getState();
      store.loadChats();

      // Check loading state immediately
      const loadingState = useChatStore.getState();
      expect(loadingState.loading.chats).toBe(true);
    });
  });

  describe('createChat', () => {
    it('creates chat successfully', async () => {
      const newChat: Chat = {
        id: '1',
        userId: 'user1',
        title: 'New Chat',
        createdAt: '2023-01-01T12:00:00Z' as any,
        updatedAt: '2023-01-01T12:00:00Z' as any,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ chat: newChat }),
      });

      const store = useChatStore.getState();
      const chatId = await store.createChat({ title: 'New Chat' });

      expect(chatId).toBe('1');
      
      const state = useChatStore.getState();
      expect(state.chats).toHaveLength(1);
      expect(state.currentChat?.id).toBe('1');
      expect(state.messages).toEqual([]);
    });

    it('handles create chat error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const store = useChatStore.getState();
      
      await expect(store.createChat({ title: 'New Chat' })).rejects.toThrow('Failed to create chat');
    });
  });

  describe('selectChat', () => {
    it('selects existing chat and loads messages', async () => {
      const existingChat: Chat = {
        id: '1',
        userId: 'user1',
        title: 'Existing Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Setup initial state with chats
      useChatStore.setState({ chats: [existingChat] });

      const mockMessages: Message[] = [
        {
          id: 'msg1',
          chatId: '1',
          role: 'user',
          content: 'Hello',
          createdAt: '2023-01-01T12:00:00Z' as any,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockMessages }),
      });

      const store = useChatStore.getState();
      await store.selectChat('1');

      const state = useChatStore.getState();
      expect(state.currentChat?.id).toBe('1');
      expect(state.messages).toHaveLength(1);
    });

    it('does nothing when chat not found', async () => {
      const store = useChatStore.getState();
      await store.selectChat('nonexistent');

      const state = useChatStore.getState();
      expect(state.currentChat).toBeNull();
    });
  });

  describe('sendMessage', () => {
    it('sends message successfully with optimistic update', async () => {
      const mockResponse = {
        message: {
          id: 'real-msg-id',
          chatId: 'chat1',
          role: 'user',
          content: 'Hello',
          createdAt: '2023-01-01T12:00:00Z',
        },
        assistantMessage: {
          id: 'assistant-msg-id',
          chatId: 'chat1',
          role: 'assistant',
          content: 'Hi there!',
          createdAt: '2023-01-01T12:01:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const store = useChatStore.getState();
      await store.sendMessage({ chatId: 'chat1', content: 'Hello' });

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(2);
      expect(state.messages[0].content).toBe('Hello');
      expect(state.messages[1].content).toBe('Hi there!');
      expect(state.loading.sending).toBe(false);
    });

    it('handles send message error and removes optimistic message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const store = useChatStore.getState();
      await store.sendMessage({ chatId: 'chat1', content: 'Hello' });

      const state = useChatStore.getState();
      expect(state.messages).toEqual([]); // Optimistic message removed
      expect(state.loading.sending).toBe(false);
      expect(state.error.sending).toBe('Failed to send message');
    });
  });

  describe('loadMessages', () => {
    it('loads messages for chat successfully', async () => {
      const mockMessages: Message[] = [
        {
          id: 'msg1',
          chatId: 'chat1',
          role: 'user',
          content: 'Hello',
          createdAt: '2023-01-01T12:00:00Z' as any,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockMessages }),
      });

      const store = useChatStore.getState();
      await store.loadMessages('chat1');

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.loading.messages).toBe(false);
    });

    it('handles load messages error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const store = useChatStore.getState();
      await store.loadMessages('chat1');

      const state = useChatStore.getState();
      expect(state.messages).toEqual([]);
      expect(state.loading.messages).toBe(false);
      expect(state.error.messages).toBe('Failed to load messages');
    });
  });

  describe('updateChatTitle', () => {
    it('updates chat title successfully', async () => {
      const existingChat: Chat = {
        id: '1',
        userId: 'user1',
        title: 'Old Title',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      useChatStore.setState({ 
        chats: [existingChat], 
        currentChat: existingChat 
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const store = useChatStore.getState();
      await store.updateChatTitle('1', 'New Title');

      const state = useChatStore.getState();
      expect(state.chats[0].title).toBe('New Title');
      expect(state.currentChat?.title).toBe('New Title');
    });
  });

  describe('deleteChat', () => {
    it('deletes chat successfully', async () => {
      const existingChat: Chat = {
        id: '1',
        userId: 'user1',
        title: 'Chat to Delete',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      useChatStore.setState({ 
        chats: [existingChat], 
        currentChat: existingChat,
        messages: [
          {
            id: 'msg1',
            chatId: '1',
            role: 'user',
            content: 'Hello',
            createdAt: new Date(),
          }
        ]
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const store = useChatStore.getState();
      await store.deleteChat('1');

      const state = useChatStore.getState();
      expect(state.chats).toEqual([]);
      expect(state.currentChat).toBeNull();
      expect(state.messages).toEqual([]);
    });
  });

  describe('clearError', () => {
    it('clears specific error type', () => {
      useChatStore.setState({
        error: {
          chats: 'Chat error',
          messages: 'Message error',
          sending: 'Send error',
        }
      });

      const store = useChatStore.getState();
      store.clearError('chats');

      const state = useChatStore.getState();
      expect(state.error.chats).toBeNull();
      expect(state.error.messages).toBe('Message error');
      expect(state.error.sending).toBe('Send error');
    });
  });

  describe('reset', () => {
    it('resets store to initial state', () => {
      useChatStore.setState({
        chats: [{ id: '1' } as Chat],
        currentChat: { id: '1' } as Chat,
        messages: [{ id: 'msg1' } as Message],
        loading: { chats: true, messages: true, sending: true },
        error: { chats: 'error', messages: 'error', sending: 'error' },
      });

      const store = useChatStore.getState();
      store.reset();

      const state = useChatStore.getState();
      expect(state.chats).toEqual([]);
      expect(state.currentChat).toBeNull();
      expect(state.messages).toEqual([]);
      expect(state.loading).toEqual({
        chats: false,
        messages: false,
        sending: false,
      });
      expect(state.error).toEqual({
        chats: null,
        messages: null,
        sending: null,
      });
    });
  });
});