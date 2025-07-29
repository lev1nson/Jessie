/**
 * End-to-End Chat Flow Tests
 * 
 * Tests the complete chat functionality including:
 * - Message sending and receiving
 * - Vector search integration
 * - Retry mechanism
 * - Rate limiting handling
 * - Error recovery
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ChatInterface } from '../../components/features/chat/ChatInterface';
import { useChat } from '../../hooks/useChat';

// Mock the useChat hook
vi.mock('../../hooks/useChat');
const mockUseChat = vi.mocked(useChat);

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock data
const mockChat = {
  id: 'chat-1',
  userId: 'user-1',
  title: 'Test Chat',
  createdAt: new Date('2025-01-01T10:00:00Z'),
  updatedAt: new Date('2025-01-01T10:00:00Z'),
  isActive: true,
};

const mockUserMessage = {
  id: 'msg-1',
  chatId: 'chat-1',
  role: 'user' as const,
  content: 'Test message',
  createdAt: new Date('2025-01-01T10:00:00Z'),
  status: 'sent' as const,
};

const mockAssistantMessage = {
  id: 'msg-2',
  chatId: 'chat-1',
  role: 'assistant' as const,
  content: 'Test response from vector search',
  sourceEmailIds: ['email-1', 'email-2'],
  sources: [
    { id: 'email-1', similarity: 0.85, metadata: {} },
    { id: 'email-2', similarity: 0.72, metadata: {} }
  ],
  createdAt: new Date('2025-01-01T10:01:00Z'),
};

describe('E2E Chat Flow', () => {
  const mockChatHook = {
    chats: [mockChat],
    currentChat: mockChat,
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
    sendMessageInCurrentChat: vi.fn(),
    retryMessage: vi.fn(),
    clearError: vi.fn(),
    reset: vi.fn(),
    startNewChat: vi.fn(),
    createNewChat: vi.fn(),
    activeChat: mockChat.id,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChat.mockReturnValue(mockChatHook as any);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Chat Flow', () => {
    it('should complete full message send and receive flow', async () => {
      // Setup successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: mockUserMessage,
          assistantMessage: mockAssistantMessage,
          sources: mockAssistantMessage.sources,
        }),
      });

      // Mock hook to simulate message sending
      mockChatHook.sendMessageInCurrentChat.mockImplementation(async () => {
        // Simulate API call and success
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockChat.id;
      });

      // Render chat interface
      render(<ChatInterface />);

      // Find and fill message input
      const messageInput = screen.getByPlaceholderText(/ask me about your emails/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Type message
      fireEvent.change(messageInput, { target: { value: 'What emails did I receive about the project?' } });

      // Send message
      fireEvent.click(sendButton);

      // Verify sendMessageInCurrentChat was called
      await waitFor(() => {
        expect(mockChatHook.sendMessageInCurrentChat).toHaveBeenCalledWith(
          'What emails did I receive about the project?'
        );
      });

      // Verify API call was made
      expect(mockFetch).toHaveBeenCalledWith('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: 'chat-1',
          content: 'What emails did I receive about the project?'
        }),
      });
    });

    it('should handle retry mechanism for failed messages', async () => {
      // Setup failed API response
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const failedMessage = {
        id: 'failed-msg-1',
        chatId: mockChat.id,
        role: 'user' as const,
        content: 'Failed message',
        createdAt: new Date(),
        status: 'failed' as const,
        error: 'Network error',
        retryCount: 3,
      };

      // Mock hook with failed message
      mockChatHook.messages = [failedMessage];
      mockChatHook.sendMessageInCurrentChat.mockRejectedValue(new Error('Network error'));
      mockChatHook.retryMessage.mockImplementation(async () => {
        // Simulate retry success
        return Promise.resolve();
      });

      render(<ChatInterface />);

      // Should show retry button for failed message
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      // Click retry
      fireEvent.click(retryButton);

      // Verify retry was called
      expect(mockChatHook.retryMessage).toHaveBeenCalledWith('failed-msg-1');
    });

    it('should handle rate limiting with proper UI feedback', async () => {
      // Setup rate limit error
      mockChatHook.error.sending = 'Rate limit exceeded. Please try again later.';
      
      render(<ChatInterface />);

      // Should show rate limit alert
      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
      expect(screen.getByText(/please wait.*before trying again/i)).toBeInTheDocument();

      // Message input should be disabled
      const messageInput = screen.getByPlaceholderText(/rate limited.*please wait/i);
      expect(messageInput).toBeDisabled();

      // Send button should be disabled
      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).toBeDisabled();
    });

    it('should display message status indicators correctly', async () => {
      // Test pending status
      const pendingMessage = {
        ...mockUserMessage,
        status: 'pending',
        retryCount: 1,
      };

      mockChatHook.messages = [pendingMessage];
      render(<ChatInterface />);

      expect(screen.getByText(/retrying.*\(1\/3\)/i)).toBeInTheDocument();
      expect(screen.getByTestId(/clock-icon/i) || screen.getByText(/sending/i)).toBeInTheDocument();

      // Test failed status
      const failedMessage = {
        ...mockUserMessage,
        status: 'failed',
        error: 'Failed to send message',
        retryCount: 3,
      };

      mockChatHook.messages = [failedMessage];
      render(<ChatInterface />);

      expect(screen.getByText(/failed to send message/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should show vector search sources in assistant messages', async () => {
      mockChatHook.messages = [mockUserMessage, mockAssistantMessage];
      
      render(<ChatInterface />);

      // Should show source indicator
      expect(screen.getByText(/based on 2 emails/i)).toBeInTheDocument();
      expect(screen.getByText(/relevance: 85%/i)).toBeInTheDocument();

      // Should show individual source details
      expect(screen.getByText(/#1: 85% match/i)).toBeInTheDocument();
      expect(screen.getByText(/#2: 72% match/i)).toBeInTheDocument();
    });

    it('should handle empty state correctly', async () => {
      mockChatHook.messages = [];
      mockChatHook.loading.messages = false;
      
      render(<ChatInterface />);

      // Should show welcome message
      expect(screen.getByText(/welcome to jessie/i)).toBeInTheDocument();
      expect(screen.getByText(/ask me anything about your emails/i)).toBeInTheDocument();

      // Should show example questions
      expect(screen.getByText(/show me emails from last week/i)).toBeInTheDocument();
      expect(screen.getByText(/what did john say about the meeting/i)).toBeInTheDocument();
      expect(screen.getByText(/summarize all emails from my manager/i)).toBeInTheDocument();
    });

    it('should handle loading states properly', async () => {
      // Test message loading
      mockChatHook.loading.messages = true;
      render(<ChatInterface />);

      expect(screen.getByText(/searching through emails/i)).toBeInTheDocument();
      expect(screen.getByText(/finding relevant messages/i)).toBeInTheDocument();

      // Test sending loading
      mockChatHook.loading.messages = false;
      mockChatHook.loading.sending = true;
      render(<ChatInterface />);

      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).toBeDisabled();
      // Should show loading spinner in button
      expect(sendButton.querySelector('svg')).toBeInTheDocument();
    });

    it('should handle keyboard shortcuts correctly', async () => {
      render(<ChatInterface />);

      const messageInput = screen.getByPlaceholderText(/ask me about your emails/i);
      
      // Type message
      fireEvent.change(messageInput, { target: { value: 'Test message' } });

      // Test Enter key
      fireEvent.keyDown(messageInput, { key: 'Enter', code: 'Enter' });

      expect(mockChatHook.sendMessageInCurrentChat).toHaveBeenCalled();

      // Test Shift+Enter (should not send)
      vi.clearAllMocks();
      fireEvent.keyDown(messageInput, { 
        key: 'Enter', 
        code: 'Enter', 
        shiftKey: true 
      });

      expect(mockChatHook.sendMessageInCurrentChat).not.toHaveBeenCalled();

      // Test Ctrl+Enter
      fireEvent.keyDown(messageInput, { 
        key: 'Enter', 
        code: 'Enter', 
        ctrlKey: true 
      });

      expect(mockChatHook.sendMessageInCurrentChat).toHaveBeenCalled();
    });

    it('should validate message input correctly', async () => {
      render(<ChatInterface />);

      const messageInput = screen.getByPlaceholderText(/ask me about your emails/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Empty message should disable send button
      expect(sendButton).toBeDisabled();

      // Whitespace-only message should disable send button
      fireEvent.change(messageInput, { target: { value: '   ' } });
      expect(sendButton).toBeDisabled();

      // Valid message should enable send button
      fireEvent.change(messageInput, { target: { value: 'Valid message' } });
      expect(sendButton).not.toBeDisabled();

      // Message over limit should show error and disable send
      const longMessage = 'a'.repeat(4001);
      fireEvent.change(messageInput, { target: { value: longMessage } });
      expect(sendButton).toBeDisabled();
      expect(screen.getByText(/1 over/i)).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from network errors with retry', async () => {
      // First attempt fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      // Second attempt succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: mockUserMessage,
          assistantMessage: mockAssistantMessage,
          sources: mockAssistantMessage.sources,
        }),
      });

      let attemptCount = 0;
      mockStore.sendMessage.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Network error');
        }
        // Success on retry
        return;
      });

      render(<ChatInterface />);

      const messageInput = screen.getByPlaceholderText(/ask me about your emails/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Send message
      fireEvent.change(messageInput, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);

      // Should eventually succeed after retry
      await waitFor(() => {
        expect(attemptCount).toBeGreaterThan(1);
      });
    });

    it('should handle server errors gracefully', async () => {
      // Setup server error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error occurred' }),
      });

      mockStore.error.sending = 'Server error occurred';

      render(<ChatInterface />);

      // Should show error alert
      expect(screen.getByText(/server error occurred/i)).toBeInTheDocument();
      
      // Should show retry option
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();

      // Clicking retry should clear error
      fireEvent.click(retryButton);
      expect(mockStore.clearError).toHaveBeenCalledWith('sending');
    });
  });
});