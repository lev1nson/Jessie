'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Chat, Message, ChatState, CreateChatRequest, SendMessageRequest, RetryConfig } from '../types/chat';

// Retry configuration
const RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelays: [1000, 2000, 4000], // 1s, 2s, 4s delays
};

// Helper function to determine if error is rate limiting
const isRateLimitError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.message.includes('rate limit') || 
           error.message.includes('too many requests') ||
           error.message.includes('429');
  }
  return false;
};

// Helper function to extract error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Helper function to wait for a specified delay
const wait = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

interface ChatActions {
  // Chat management
  loadChats: () => Promise<void>;
  createChat: (request: CreateChatRequest) => Promise<string | null>;
  selectChat: (chatId: string) => Promise<void>;
  updateChatTitle: (chatId: string, title: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  
  // Message management
  loadMessages: (chatId: string) => Promise<void>;
  sendMessage: (request: SendMessageRequest) => Promise<void>;
  sendMessageWithRetry: (userMessageId: string, request: SendMessageRequest, retryCount: number) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  
  // UI state management
  clearError: (type: 'chats' | 'messages' | 'sending') => void;
  reset: () => void;
}

type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
  chats: [],
  currentChat: null,
  messages: [],
  loading: {
    chats: false,
    messages: false,
    sending: false,
  },
  error: {
    chats: null,
    messages: null,
    sending: null,
  },
};

export const useChatStore = create<ChatStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    loadChats: async () => {
      set((state) => ({
        loading: { ...state.loading, chats: true },
        error: { ...state.error, chats: null },
      }));

      try {
        const response = await fetch('/api/chats', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load chats');
        }

        const { chats }: { chats: Chat[] } = await response.json();
        
        // Transform dates from string to Date objects
        const transformedChats = chats.map(chat => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
        }));

        set((state) => ({
          chats: transformedChats,
          loading: { ...state.loading, chats: false },
        }));
      } catch (error) {
        set((state) => ({
          loading: { ...state.loading, chats: false },
          error: { 
            ...state.error, 
            chats: error instanceof Error ? error.message : 'Failed to load chats' 
          },
        }));
      }
    },

    createChat: async (request: CreateChatRequest) => {
      try {
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to create chat: ${response.status}`);
        }

        const { chat }: { chat: Chat } = await response.json();
        
        // Transform dates
        const transformedChat = {
          ...chat,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
        };

        set((state) => ({
          chats: [transformedChat, ...state.chats],
          currentChat: transformedChat,
          messages: [],
        }));

        return chat.id;
      } catch (error) {
        console.error('Chat creation error:', error);
        set((state) => ({ 
          error: { 
            ...state.error, 
            createChat: error instanceof Error ? error.message : 'Failed to create chat' 
          } 
        }));
        return null;
      }
    },

    selectChat: async (chatId: string) => {
      const chat = get().chats.find(c => c.id === chatId);
      if (!chat) return;

      set({ currentChat: chat });
      await get().loadMessages(chatId);
    },

    updateChatTitle: async (chatId: string, title: string) => {
      try {
        const response = await fetch(`/api/chats/${chatId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title }),
        });

        if (!response.ok) {
          throw new Error('Failed to update chat title');
        }

        set((state) => ({
          chats: state.chats.map(chat =>
            chat.id === chatId ? { ...chat, title } : chat
          ),
          currentChat: state.currentChat?.id === chatId 
            ? { ...state.currentChat, title }
            : state.currentChat,
        }));
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to update chat title');
      }
    },

    deleteChat: async (chatId: string) => {
      try {
        const response = await fetch(`/api/chats/${chatId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete chat');
        }

        set((state) => ({
          chats: state.chats.filter(chat => chat.id !== chatId),
          currentChat: state.currentChat?.id === chatId ? null : state.currentChat,
          messages: state.currentChat?.id === chatId ? [] : state.messages,
        }));
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to delete chat');
      }
    },

    loadMessages: async (chatId: string) => {
      set((state) => ({
        loading: { ...state.loading, messages: true },
        error: { ...state.error, messages: null },
      }));

      try {
        const response = await fetch(`/api/chats/${chatId}/messages`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load messages');
        }

        const { messages }: { messages: Message[] } = await response.json();
        
        // Transform dates
        const transformedMessages = messages.map(message => ({
          ...message,
          createdAt: new Date(message.createdAt),
        }));

        set((state) => ({
          messages: transformedMessages,
          loading: { ...state.loading, messages: false },
        }));
      } catch (error) {
        set((state) => ({
          loading: { ...state.loading, messages: false },
          error: { 
            ...state.error, 
            messages: error instanceof Error ? error.message : 'Failed to load messages' 
          },
        }));
      }
    },

    sendMessage: async (request: SendMessageRequest) => {
      console.log('Store sendMessage called with:', request);
      
      const userMessageId = `temp-${Date.now()}`;
      const userMessage: Message = {
        id: userMessageId,
        chatId: request.chatId,
        role: 'user',
        content: request.content,
        createdAt: new Date(),
        status: 'pending',
        retryCount: 0,
      };

      // Add optimistic user message
      set((state) => ({
        messages: [...state.messages, userMessage],
        loading: { ...state.loading, sending: true },
        error: { ...state.error, sending: null },
      }));

      return get().sendMessageWithRetry(userMessageId, request, 0);
    },

    sendMessageWithRetry: async (userMessageId: string, request: SendMessageRequest, retryCount: number) => {
      try {
        console.log(`Attempt ${retryCount + 1} for message ${userMessageId}`);
        
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            chatId: request.chatId,
            content: request.content 
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(errorMessage);
        }

        const { message, assistantMessage, sources } = await response.json();
        
        // Transform dates
        const transformedMessage = {
          ...message,
          createdAt: new Date(message.createdAt),
          status: 'sent' as const,
        };
        
        const transformedAssistantMessage = assistantMessage ? {
          ...assistantMessage,
          createdAt: new Date(assistantMessage.createdAt),
          sources: sources || [],
        } : null;

        // Success - update messages and clear loading state
        set((state) => ({
          messages: [
            ...state.messages.filter(m => m.id !== userMessageId),
            transformedMessage,
            ...(transformedAssistantMessage ? [transformedAssistantMessage] : []),
          ],
          loading: { ...state.loading, sending: false },
          chats: state.chats.map(chat =>
            chat.id === request.chatId
              ? {
                  ...chat,
                  lastMessage: transformedAssistantMessage?.content || transformedMessage.content,
                  updatedAt: new Date(),
                }
              : chat
          ),
        }));

      } catch (error) {
        const errorMessage = getErrorMessage(error);
        const isRateLimit = isRateLimitError(error);
        
        // Check if we should retry
        if (retryCount < RETRY_CONFIG.maxRetries) {
          const nextRetryCount = retryCount + 1;
          const delay = RETRY_CONFIG.retryDelays[retryCount] || RETRY_CONFIG.retryDelays[RETRY_CONFIG.retryDelays.length - 1];
          
          // Update message status to show retry attempt
          set((state) => ({
            messages: state.messages.map(m =>
              m.id === userMessageId
                ? { 
                    ...m, 
                    retryCount: nextRetryCount,
                    error: isRateLimit ? 'Rate limited - retrying...' : 'Retrying...'
                  }
                : m
            ),
          }));
          
          // Wait before retry
          await wait(delay);
          
          // Retry the request
          return get().sendMessageWithRetry(userMessageId, request, nextRetryCount);
        } else {
          // Max retries reached - mark as failed
          set((state) => ({
            messages: state.messages.map(m =>
              m.id === userMessageId
                ? { 
                    ...m, 
                    status: 'failed' as const,
                    error: isRateLimit 
                      ? 'Rate limit exceeded. Please try again later.' 
                      : errorMessage,
                    retryCount: RETRY_CONFIG.maxRetries
                  }
                : m
            ),
            loading: { ...state.loading, sending: false },
            error: { 
              ...state.error, 
              sending: isRateLimit 
                ? 'Rate limit exceeded. Please wait before sending more messages.' 
                : errorMessage 
            },
          }));
        }
      }
    },

    retryMessage: async (messageId: string) => {
      const state = get();
      const message = state.messages.find(m => m.id === messageId);
      
      if (!message || message.role !== 'user' || message.status !== 'failed') {
        console.warn('Cannot retry message:', messageId, message?.status);
        return;
      }

      // Reset the message status to retry
      set((state) => ({
        messages: state.messages.map(m =>
          m.id === messageId
            ? { 
                ...m, 
                status: 'pending',
                error: undefined,
                retryCount: 0
              }
            : m
        ),
        loading: { ...state.loading, sending: true },
        error: { ...state.error, sending: null },
      }));

      const request: SendMessageRequest = {
        chatId: message.chatId,
        content: message.content
      };

      return get().sendMessageWithRetry(messageId, request, 0);
    },

    clearError: (type: 'chats' | 'messages' | 'sending') => {
      set((state) => ({
        error: { ...state.error, [type]: null },
      }));
    },

    reset: () => {
      set(initialState);
    },
  }))
);