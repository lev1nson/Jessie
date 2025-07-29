'use client';

import { useEffect } from 'react';
import { useChatStore } from '../lib/stores/chatStore';

export function useChat() {
  const store = useChatStore();

  // Load chats on mount
  useEffect(() => {
    store.loadChats();
  }, [store.loadChats]);

  // Helper function to start a new chat
  const startNewChat = async (firstMessage?: string) => {
    try {
      const chatId = await store.createChat({ 
        title: firstMessage ? firstMessage.slice(0, 50) + '...' : 'New Chat',
        firstMessage 
      });
      
      if (!chatId) {
        throw new Error('Failed to create chat');
      }
      
      if (firstMessage) {
        await store.sendMessage({ chatId, content: firstMessage });
      }
      
      return chatId;
    } catch (error) {
      console.error('Failed to start new chat:', error);
      throw error;
    }
  };

  // Helper function to send a message in current chat
  const sendMessageInCurrentChat = async (content: string) => {
    if (!store.currentChat) {
      // Create a new chat if none is selected
      const chatId = await startNewChat(content);
      if (!chatId) {
        throw new Error('Failed to create new chat');
      }
      return chatId;
    }

    await store.sendMessage({ 
      chatId: store.currentChat.id, 
      content 
    });
    return store.currentChat.id;
  };

  // Helper function to create a new empty chat
  const createNewChat = async () => {
    try {
      const chatId = await store.createChat({ 
        title: 'New Chat' 
      });
      
      if (!chatId) {
        throw new Error('Failed to create chat');
      }
      
      return chatId;
    } catch (error) {
      console.error('Failed to create new chat:', error);
      throw error;
    }
  };

  return {
    // State
    chats: store.chats,
    currentChat: store.currentChat,
    activeChat: store.currentChat?.id,
    messages: store.messages,
    loading: store.loading,
    error: store.error,

    // Actions
    loadChats: store.loadChats,
    createChat: store.createChat,
    selectChat: store.selectChat,
    updateChatTitle: store.updateChatTitle,
    deleteChat: store.deleteChat,
    loadMessages: store.loadMessages,
    sendMessage: store.sendMessage,
    retryMessage: store.retryMessage,
    clearError: store.clearError,
    reset: store.reset,

    // Helper functions
    startNewChat,
    sendMessageInCurrentChat,
    createNewChat,
  };
}