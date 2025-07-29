/**
 * Retry Mechanism and Rate Limiting E2E Tests
 * 
 * Focused tests for:
 * - Message retry functionality
 * - Rate limiting error handling
 * - Error recovery scenarios
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useChatStore } from '../../lib/stores/chatStore';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('E2E Retry Mechanism and Rate Limiting', () => {
  let mockStore;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    
    // Clear all timers
    vi.clearAllTimers();
    vi.useFakeTimers();
    
    // Reset store
    mockStore = useChatStore.getState();
    mockStore.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Message Retry Mechanism', () => {
    it('should retry failed messages up to 3 times with exponential backoff', async () => {
      const { result } = renderHook(() => useChatStore());

      // Setup store with a chat
      act(() => {
        result.current.chats = [{
          id: 'chat-1',
          userId: 'user-1',
          title: 'Test Chat',
          createdAt: new Date(),
          updatedAt: new Date(),
        }];
        result.current.currentChat = result.current.chats[0];
      });

      // Mock failed API calls for first 2 attempts, success on 3rd
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: {
              id: 'msg-1',
              chatId: 'chat-1',
              role: 'user',
              content: 'Test message',
              createdAt: new Date().toISOString(),
            },
            assistantMessage: {
              id: 'msg-2',
              chatId: 'chat-1',
              role: 'assistant',
              content: 'Response',
              createdAt: new Date().toISOString(),
            },
            sources: [],
          }),
        });

      // Send message
      const sendPromise = act(async () => {
        await result.current.sendMessage({
          chatId: 'chat-1',
          content: 'Test message',
        });
      });

      // Fast-forward through the retry delays
      // First retry after 1s
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      // Second retry after 2s more
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      // Wait for completion
      await sendPromise;

      // Verify 3 fetch calls were made (initial + 2 retries)
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Verify exponential backoff delays
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/chat/messages', expect.any(Object));
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/chat/messages', expect.any(Object));
      expect(mockFetch).toHaveBeenNthCalledWith(3, '/api/chat/messages', expect.any(Object));

      // Should have successful message in state
      expect(result.current.messages).toHaveLength(2); // user + assistant message
      expect(result.current.loading.sending).toBe(false);
    });

    it('should mark message as failed after max retries', async () => {
      const { result } = renderHook(() => useChatStore());

      // Setup store with a chat
      act(() => {
        result.current.chats = [{
          id: 'chat-1',
          userId: 'user-1',
          title: 'Test Chat',
          createdAt: new Date(),
          updatedAt: new Date(),
        }];
        result.current.currentChat = result.current.chats[0];
      });

      // Mock all API calls to fail
      mockFetch.mockRejectedValue(new Error('Persistent network error'));

      // Send message
      const sendPromise = act(async () => {
        await result.current.sendMessage({
          chatId: 'chat-1',
          content: 'Test message',
        });
      });

      // Fast-forward through all retry attempts
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000); // First retry
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000); // Second retry
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000); // Third retry
      });

      await sendPromise;

      // Verify 4 fetch calls were made (initial + 3 retries)
      expect(mockFetch).toHaveBeenCalledTimes(4);

      // Should have failed message in state
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].status).toBe('failed');
      expect(result.current.messages[0].retryCount).toBe(3);
      expect(result.current.messages[0].error).toBe('Persistent network error');
      expect(result.current.loading.sending).toBe(false);
      expect(result.current.error.sending).toBe('Persistent network error');
    });

    it('should handle manual retry of failed messages', async () => {
      const { result } = renderHook(() => useChatStore());

      // Setup store with a failed message
      act(() => {
        result.current.chats = [{
          id: 'chat-1',
          userId: 'user-1',
          title: 'Test Chat',
          createdAt: new Date(),
          updatedAt: new Date(),
        }];
        result.current.currentChat = result.current.chats[0];
        result.current.messages = [{
          id: 'failed-msg-1',
          chatId: 'chat-1',
          role: 'user',
          content: 'Failed message',
          createdAt: new Date(),
          status: 'failed',
          error: 'Network error',
          retryCount: 3,
        }];
      });

      // Mock successful API call for retry
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            id: 'msg-1',
            chatId: 'chat-1',
            role: 'user',
            content: 'Failed message',
            createdAt: new Date().toISOString(),
          },
          assistantMessage: {
            id: 'msg-2',
            chatId: 'chat-1',
            role: 'assistant',
            content: 'Response',
            createdAt: new Date().toISOString(),
          },
          sources: [],
        }),
      });

      // Retry the failed message
      await act(async () => {
        await result.current.retryMessage('failed-msg-1');
      });

      // Verify API call was made
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: 'chat-1',
          content: 'Failed message',
        }),
      });

      // Should have successful messages in state
      expect(result.current.messages).toHaveLength(2); // user + assistant message
      expect(result.current.messages[0].status).toBe('sent');
      expect(result.current.loading.sending).toBe(false);
    });
  });

  describe('Rate Limiting Handling', () => {
    it('should detect rate limiting errors and retry with appropriate delays', async () => {
      const { result } = renderHook(() => useChatStore());

      // Setup store with a chat
      act(() => {
        result.current.chats = [{
          id: 'chat-1',
          userId: 'user-1',
          title: 'Test Chat',
          createdAt: new Date(),
          updatedAt: new Date(),
        }];
        result.current.currentChat = result.current.chats[0];
      });

      // Mock rate limit error, then success
      mockFetch
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: {
              id: 'msg-1',
              chatId: 'chat-1',
              role: 'user',
              content: 'Test message',
              createdAt: new Date().toISOString(),
            },
            assistantMessage: {
              id: 'msg-2',
              chatId: 'chat-1',
              role: 'assistant',
              content: 'Response',
              createdAt: new Date().toISOString(),
            },
            sources: [],
          }),
        });

      // Send message
      const sendPromise = act(async () => {
        await result.current.sendMessage({
          chatId: 'chat-1',
          content: 'Test message',
        });
      });

      // Check that message shows rate limit status
      expect(result.current.messages[0].error).toBe('Rate limited - retrying...');
      expect(result.current.messages[0].retryCount).toBe(1);

      // Fast-forward through retry delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      await sendPromise;

      // Should succeed after rate limit retry
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].status).toBe('sent');
    });

    it('should handle 429 HTTP status as rate limiting error', async () => {
      const { result } = renderHook(() => useChatStore());

      // Setup store with a chat
      act(() => {
        result.current.chats = [{
          id: 'chat-1',
          userId: 'user-1',
          title: 'Test Chat',
          createdAt: new Date(),
          updatedAt: new Date(),
        }];
        result.current.currentChat = result.current.chats[0];
      });

      // Mock 429 status error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: 'HTTP 429: Too Many Requests' }),
      });

      // Send message
      await act(async () => {
        await result.current.sendMessage({
          chatId: 'chat-1',
          content: 'Test message',
        });
      });

      // Fast-forward through all retries
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000); // Fast forward through all retries
      });

      // Should detect as rate limit error
      expect(result.current.error.sending).toBe('Rate limit exceeded. Please wait before sending more messages.');
      expect(result.current.messages[0].error).toBe('Rate limit exceeded. Please try again later.');
    });

    it('should show different error message for rate limit vs other errors', async () => {
      const { result } = renderHook(() => useChatStore());

      // Setup store with a chat
      act(() => {
        result.current.chats = [{
          id: 'chat-1',
          userId: 'user-1',
          title: 'Test Chat',
          createdAt: new Date(),
          updatedAt: new Date(),
        }];
        result.current.currentChat = result.current.chats[0];
      });

      // Test rate limit error
      mockFetch.mockRejectedValue(new Error('Rate limit exceeded'));

      await act(async () => {
        await result.current.sendMessage({
          chatId: 'chat-1',
          content: 'Test message 1',
        });
      });

      // Fast-forward through all retries
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });

      expect(result.current.error.sending).toBe('Rate limit exceeded. Please wait before sending more messages.');

      // Reset store
      act(() => {
        result.current.messages = [];
        result.current.error.sending = null;
      });

      // Test generic error
      mockFetch.mockRejectedValue(new Error('Server error'));

      await act(async () => {
        await result.current.sendMessage({
          chatId: 'chat-1',
          content: 'Test message 2',
        });
      });

      // Fast-forward through all retries
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });

      expect(result.current.error.sending).toBe('Server error');
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from intermittent network issues', async () => {
      const { result } = renderHook(() => useChatStore());

      // Setup store
      act(() => {
        result.current.chats = [{
          id: 'chat-1',
          userId: 'user-1',
          title: 'Test Chat',
          createdAt: new Date(),
          updatedAt: new Date(),
        }];
        result.current.currentChat = result.current.chats[0];
      });

      // Simulate intermittent failure pattern
      mockFetch
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: {
              id: 'msg-1',
              chatId: 'chat-1',
              role: 'user',
              content: 'Test message',
              createdAt: new Date().toISOString(),
            },
            assistantMessage: {
              id: 'msg-2',
              chatId: 'chat-1',
              role: 'assistant',
              content: 'Response',
              createdAt: new Date().toISOString(),
            },
            sources: [],
          }),
        });

      // Send message
      const sendPromise = act(async () => {
        await result.current.sendMessage({
          chatId: 'chat-1',
          content: 'Test message',
        });
      });

      // Fast-forward through retries
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000); // First retry
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000); // Second retry
      });

      await sendPromise;

      // Should succeed after retries
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].status).toBe('sent');
      expect(result.current.loading.sending).toBe(false);
      expect(result.current.error.sending).toBe(null);
    });

    it('should handle mixed error types correctly', async () => {
      const { result } = renderHook(() => useChatStore());

      // Setup store
      act(() => {
        result.current.chats = [{
          id: 'chat-1',
          userId: 'user-1',
          title: 'Test Chat',
          createdAt: new Date(),
          updatedAt: new Date(),
        }];
        result.current.currentChat = result.current.chats[0];
      });

      // Mix of rate limit and network errors
      mockFetch
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Too many requests'));

      // Send message
      await act(async () => {
        await result.current.sendMessage({
          chatId: 'chat-1',
          content: 'Test message',
        });
      });

      // Fast-forward through all retries
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });

      // Should fail with appropriate rate limit message
      expect(result.current.error.sending).toBe('Rate limit exceeded. Please wait before sending more messages.');
    });
  });
});