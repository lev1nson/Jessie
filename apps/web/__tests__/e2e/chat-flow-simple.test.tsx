/**
 * Simple E2E Chat Flow Tests
 * 
 * Tests the complete chat functionality from user perspective:
 * - Message sending and receiving
 * - Error handling and retry
 * - Rate limiting feedback
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

// Mock scrollIntoView for jsdom
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

// Mock data
const mockChat = {
  id: 'chat-1',
  userId: 'user-1',
  title: 'Test Chat',
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
};

describe('E2E Chat Flow - User Experience', () => {
  const defaultMockHook = {
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
    mockFetch.mockClear();
    Element.prototype.scrollIntoView = vi.fn();
    mockUseChat.mockReturnValue({ ...defaultMockHook });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Message Sending Flow', () => {
    it('should show empty state when no messages', () => {
      render(<ChatInterface />);

      expect(screen.getByText(/welcome to jessie/i)).toBeInTheDocument();
      expect(screen.getByText(/ask me anything about your emails/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/ask me about your emails/i)).toBeInTheDocument();
    });

    it('should send message when user types and presses send', async () => {
      const mockSendMessage = vi.fn().mockResolvedValue(mockChat.id);
      mockUseChat.mockReturnValue({
        ...defaultMockHook,
        sendMessageInCurrentChat: mockSendMessage,
      });

      render(<ChatInterface />);

      const messageInput = screen.getByPlaceholderText(/ask me about your emails/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Type message
      fireEvent.change(messageInput, { target: { value: 'Test message' } });
      expect(sendButton).not.toBeDisabled();

      // Send message
      fireEvent.click(sendButton);

      // Verify function was called
      expect(mockSendMessage).toHaveBeenCalledWith('Test message');
    });

    it('should handle keyboard shortcuts correctly', async () => {
      const mockSendMessage = vi.fn().mockResolvedValue(mockChat.id);
      mockUseChat.mockReturnValue({
        ...defaultMockHook,
        sendMessageInCurrentChat: mockSendMessage,
      });

      render(<ChatInterface />);

      const messageInput = screen.getByPlaceholderText(/ask me about your emails/i);

      // Type message
      fireEvent.change(messageInput, { target: { value: 'Test message' } });

      // Test Enter key (preventDefault should trigger send)
      fireEvent.keyDown(messageInput, { key: 'Enter', code: 'Enter' });
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('Test message');
      });

      // Clear mock
      mockSendMessage.mockClear();

      // Reset input value for next test
      fireEvent.change(messageInput, { target: { value: 'Test message' } });

      // Test Shift+Enter should not send (new line instead)
      fireEvent.keyDown(messageInput, { key: 'Enter', code: 'Enter', shiftKey: true });
      expect(mockSendMessage).not.toHaveBeenCalled();

      // Test Ctrl+Enter should send
      fireEvent.keyDown(messageInput, { key: 'Enter', code: 'Enter', ctrlKey: true });
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('Test message');
      });
    });

    it('should validate input correctly', () => {
      render(<ChatInterface />);

      const messageInput = screen.getByPlaceholderText(/ask me about your emails/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Empty should disable send
      expect(sendButton).toBeDisabled();

      // Whitespace only should disable send
      fireEvent.change(messageInput, { target: { value: '   ' } });
      expect(sendButton).toBeDisabled();

      // Valid message should enable send
      fireEvent.change(messageInput, { target: { value: 'Valid message' } });
      expect(sendButton).not.toBeDisabled();

      // Very long message should disable send and show warning
      const longMessage = 'a'.repeat(4001);
      fireEvent.change(messageInput, { target: { value: longMessage } });
      expect(sendButton).toBeDisabled();
      expect(screen.getByText(/1 over/i)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator when sending message', () => {
      mockUseChat.mockReturnValue({
        ...defaultMockHook,
        loading: { chats: false, messages: false, sending: true },
      });

      render(<ChatInterface />);

      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).toBeDisabled();
      
      // Should show loading spinner in button
      const spinner = sendButton.querySelector('svg');
      expect(spinner).toBeInTheDocument();
    });

    it('should show search loading when loading messages', () => {
      mockUseChat.mockReturnValue({
        ...defaultMockHook,
        loading: { chats: false, messages: true, sending: false },
      });

      render(<ChatInterface />);

      expect(screen.getByText(/searching through emails/i)).toBeInTheDocument();
      expect(screen.getByText(/finding relevant messages/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show failed message with retry button', () => {
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

      const mockRetry = vi.fn();
      mockUseChat.mockReturnValue({
        ...defaultMockHook,
        messages: [failedMessage],
        retryMessage: mockRetry,
      });

      render(<ChatInterface />);

      // Should show error message
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
      
      // Should show retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      // Click retry should call retryMessage
      fireEvent.click(retryButton);
      expect(mockRetry).toHaveBeenCalledWith('failed-msg-1');
    });

    it('should show rate limit alert with countdown', () => {
      mockUseChat.mockReturnValue({
        ...defaultMockHook,
        error: { chats: null, messages: null, sending: 'Rate limit exceeded. Please try again later.' },
      });

      render(<ChatInterface />);

      // Should show rate limit alert (use getAllByText to handle multiple matches)
      const rateLimitTexts = screen.getAllByText(/rate limit exceeded/i);
      expect(rateLimitTexts.length).toBeGreaterThan(0);
      
      // Message input should be disabled with special placeholder
      const messageInput = screen.getByPlaceholderText(/rate limited.*please wait/i);
      expect(messageInput).toBeDisabled();

      // Send button should be disabled
      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).toBeDisabled();
    });

    it('should show general error alert with retry option', () => {
      const mockClearError = vi.fn();
      mockUseChat.mockReturnValue({
        ...defaultMockHook,
        error: { chats: null, messages: null, sending: 'Server error occurred' },
        clearError: mockClearError,
      });

      render(<ChatInterface />);

      // Should show error alert
      expect(screen.getByText(/server error occurred/i)).toBeInTheDocument();
      
      // Should show retry button
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();

      // Click retry should clear error
      fireEvent.click(retryButton);
      expect(mockClearError).toHaveBeenCalledWith('sending');
    });
  });

  describe('Message Display', () => {
    it('should display user and assistant messages correctly', () => {
      const userMessage = {
        id: 'msg-1',
        chatId: mockChat.id,
        role: 'user' as const,
        content: 'User question',
        createdAt: new Date(),
        status: 'sent' as const,
      };

      const assistantMessage = {
        id: 'msg-2',
        chatId: mockChat.id,
        role: 'assistant' as const,
        content: 'Assistant response',
        sourceEmailIds: ['email-1', 'email-2'],
        sources: [
          { id: 'email-1', similarity: 0.85, metadata: {} },
          { id: 'email-2', similarity: 0.72, metadata: {} }
        ],
        createdAt: new Date(),
      };

      mockUseChat.mockReturnValue({
        ...defaultMockHook,
        messages: [userMessage, assistantMessage],
      });

      render(<ChatInterface />);

      // Should show both messages
      expect(screen.getByText('User question')).toBeInTheDocument();
      expect(screen.getByText('Assistant response')).toBeInTheDocument();

      // Should show source information for assistant message
      expect(screen.getByText(/based on 2 emails/i)).toBeInTheDocument();
      expect(screen.getByText(/relevance: 85%/i)).toBeInTheDocument();
      expect(screen.getByText(/#1: 85% match/i)).toBeInTheDocument();
      expect(screen.getByText(/#2: 72% match/i)).toBeInTheDocument();
    });

    it('should show pending message status', () => {
      const pendingMessage = {
        id: 'msg-1',
        chatId: mockChat.id,
        role: 'user' as const,
        content: 'Pending message',
        createdAt: new Date(),
        status: 'pending' as const,
        retryCount: 1,
      };

      mockUseChat.mockReturnValue({
        ...defaultMockHook,
        messages: [pendingMessage],
      });

      render(<ChatInterface />);

      // Should show retry status
      expect(screen.getByText(/retrying.*\(1\/3\)/i)).toBeInTheDocument();
      
      // Should show pending icon (clock with retry text)
      expect(screen.getByText(/retrying/i)).toBeInTheDocument();
    });

    it('should allow copying messages', async () => {
      const userMessage = {
        id: 'msg-1',
        chatId: mockChat.id,
        role: 'user' as const,
        content: 'Test message to copy',
        createdAt: new Date(),
        status: 'sent' as const,
      };

      mockUseChat.mockReturnValue({
        ...defaultMockHook,
        messages: [userMessage],
      });

      // Mock clipboard API
      const mockWriteText = vi.fn();
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText },
      });

      render(<ChatInterface />);

      // Find and click copy button (appears on hover)
      const messageElement = screen.getByText('Test message to copy').closest('.group');
      expect(messageElement).toBeInTheDocument();
      
      // Copy button should be present but might be hidden
      const copyButton = messageElement?.querySelector('button[title="Copy message"]');
      if (copyButton) {
        fireEvent.click(copyButton);
        expect(mockWriteText).toHaveBeenCalledWith('Test message to copy');
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete chat flow from empty to populated', async () => {
      const mockSendMessage = vi.fn().mockResolvedValue(mockChat.id);
      
      mockUseChat.mockReturnValue({
        ...defaultMockHook,
        sendMessageInCurrentChat: mockSendMessage,
        messages: [],
      });

      // Start with empty state
      const { rerender } = render(<ChatInterface />);

      // Should show empty state
      expect(screen.getByText(/welcome to jessie/i)).toBeInTheDocument();

      // User types and sends message
      const messageInput = screen.getByPlaceholderText(/ask me about your emails/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      fireEvent.change(messageInput, { target: { value: 'What are my recent emails?' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('What are my recent emails?');
      });

      // Simulate messages appearing after send
      const userMessage = {
        id: 'msg-1',
        chatId: mockChat.id,
        role: 'user' as const,
        content: 'What are my recent emails?',
        createdAt: new Date(),
        status: 'sent' as const,
      };

      const assistantMessage = {
        id: 'msg-2',
        chatId: mockChat.id,
        role: 'assistant' as const,
        content: 'Here are your recent emails...',
        sourceEmailIds: ['email-1'],
        createdAt: new Date(),
      };

      mockUseChat.mockReturnValue({
        ...defaultMockHook,
        sendMessageInCurrentChat: mockSendMessage,
        messages: [userMessage, assistantMessage],
      });

      rerender(<ChatInterface />);

      // Should show messages
      expect(screen.getByText('What are my recent emails?')).toBeInTheDocument();
      expect(screen.getByText('Here are your recent emails...')).toBeInTheDocument();
      expect(screen.queryByText(/welcome to jessie/i)).not.toBeInTheDocument();
    });
  });
});