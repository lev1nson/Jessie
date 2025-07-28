import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from './useChat';
import { useChatStore } from '../lib/stores/chatStore';

// Mock the store
vi.mock('../lib/stores/chatStore');

const mockStore = {
  chats: [],
  currentChat: null,
  messages: [],
  loading: { chats: false, messages: false, sending: false },
  error: { chats: null, messages: null, sending: null },
  loadChats: vi.fn(),
  createChat: vi.fn(),
  selectChat: vi.fn(),
  updateChatTitle: vi.fn(),
  deleteChat: vi.fn(),
  loadMessages: vi.fn(),
  sendMessage: vi.fn(),
  clearError: vi.fn(),
  reset: vi.fn(),
};

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useChatStore as any).mockReturnValue(mockStore);
  });

  it('returns all store values and actions', () => {
    const { result } = renderHook(() => useChat());

    expect(result.current.chats).toEqual([]);
    expect(result.current.currentChat).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toEqual({ chats: false, messages: false, sending: false });
    expect(result.current.error).toEqual({ chats: null, messages: null, sending: null });

    // Check actions exist
    expect(typeof result.current.loadChats).toBe('function');
    expect(typeof result.current.createChat).toBe('function');
    expect(typeof result.current.selectChat).toBe('function');
    expect(typeof result.current.startNewChat).toBe('function');
    expect(typeof result.current.sendMessageInCurrentChat).toBe('function');
  });

  it('calls loadChats on mount', () => {
    renderHook(() => useChat());

    expect(mockStore.loadChats).toHaveBeenCalledOnce();
  });

  describe('startNewChat', () => {
    it('creates chat and sends first message', async () => {
      mockStore.createChat.mockResolvedValue('chat-id-123');
      mockStore.sendMessage.mockResolvedValue(undefined);

      const { result } = renderHook(() => useChat());

      await act(async () => {
        const chatId = await result.current.startNewChat('Hello world');
        expect(chatId).toBe('chat-id-123');
      });

      expect(mockStore.createChat).toHaveBeenCalledWith({
        title: 'Hello world...',
        firstMessage: 'Hello world',
      });
      expect(mockStore.sendMessage).toHaveBeenCalledWith({
        chatId: 'chat-id-123',
        content: 'Hello world',
      });
    });

    it('creates chat without first message', async () => {
      mockStore.createChat.mockResolvedValue('chat-id-123');

      const { result } = renderHook(() => useChat());

      await act(async () => {
        const chatId = await result.current.startNewChat();
        expect(chatId).toBe('chat-id-123');
      });

      expect(mockStore.createChat).toHaveBeenCalledWith({
        title: 'New Chat',
        firstMessage: undefined,
      });
      expect(mockStore.sendMessage).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      const error = new Error('Failed to create chat');
      mockStore.createChat.mockRejectedValue(error);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useChat());

      await act(async () => {
        await expect(result.current.startNewChat('Hello')).rejects.toThrow('Failed to create chat');
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to start new chat:', error);
      consoleSpy.mockRestore();
    });

    it('truncates long first messages for title', async () => {
      mockStore.createChat.mockResolvedValue('chat-id-123');
      
      const longMessage = 'This is a very long message that should be truncated when used as a title for the chat';
      const { result } = renderHook(() => useChat());

      await act(async () => {
        await result.current.startNewChat(longMessage);
      });

      expect(mockStore.createChat).toHaveBeenCalledWith({
        title: longMessage.slice(0, 50) + '...',
        firstMessage: longMessage,
      });
    });
  });

  describe('sendMessageInCurrentChat', () => {
    it('sends message in current chat', async () => {
      const currentChat = { id: 'chat-123', title: 'Current Chat' };
      const storeWithCurrentChat = { ...mockStore, currentChat };
      (useChatStore as any).mockReturnValue(storeWithCurrentChat);

      mockStore.sendMessage.mockResolvedValue(undefined);

      const { result } = renderHook(() => useChat());

      await act(async () => {
        const chatId = await result.current.sendMessageInCurrentChat('Hello');
        expect(chatId).toBe('chat-123');
      });

      expect(mockStore.sendMessage).toHaveBeenCalledWith({
        chatId: 'chat-123',
        content: 'Hello',
      });
    });

    it('creates new chat when no current chat', async () => {
      mockStore.createChat.mockResolvedValue('new-chat-id');
      mockStore.sendMessage.mockResolvedValue(undefined);

      const { result } = renderHook(() => useChat());

      await act(async () => {
        const chatId = await result.current.sendMessageInCurrentChat('Hello');
        expect(chatId).toBe('new-chat-id');
      });

      expect(mockStore.createChat).toHaveBeenCalledWith({
        title: 'Hello...',
        firstMessage: 'Hello',
      });
      expect(mockStore.sendMessage).toHaveBeenCalledWith({
        chatId: 'new-chat-id',
        content: 'Hello',
      });
    });
  });

  it('exposes all store actions directly', () => {
    const { result } = renderHook(() => useChat());

    // Test that all actions are exposed
    expect(result.current.loadChats).toBe(mockStore.loadChats);
    expect(result.current.createChat).toBe(mockStore.createChat);
    expect(result.current.selectChat).toBe(mockStore.selectChat);
    expect(result.current.updateChatTitle).toBe(mockStore.updateChatTitle);
    expect(result.current.deleteChat).toBe(mockStore.deleteChat);
    expect(result.current.loadMessages).toBe(mockStore.loadMessages);
    expect(result.current.sendMessage).toBe(mockStore.sendMessage);
    expect(result.current.clearError).toBe(mockStore.clearError);
    expect(result.current.reset).toBe(mockStore.reset);
  });

  it('exposes all store state directly', () => {
    const mockStateWithData = {
      ...mockStore,
      chats: [{ id: '1', title: 'Test Chat' }],
      currentChat: { id: '1', title: 'Test Chat' },
      messages: [{ id: 'msg1', content: 'Hello' }],
      loading: { chats: true, messages: false, sending: true },
      error: { chats: 'error', messages: null, sending: null },
    };

    (useChatStore as any).mockReturnValue(mockStateWithData);

    const { result } = renderHook(() => useChat());

    expect(result.current.chats).toEqual([{ id: '1', title: 'Test Chat' }]);
    expect(result.current.currentChat).toEqual({ id: '1', title: 'Test Chat' });
    expect(result.current.messages).toEqual([{ id: 'msg1', content: 'Hello' }]);
    expect(result.current.loading).toEqual({ chats: true, messages: false, sending: true });
    expect(result.current.error).toEqual({ chats: 'error', messages: null, sending: null });
  });
});