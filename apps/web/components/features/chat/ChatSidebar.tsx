'use client';

import { ChatList } from './ChatList';
import { AuthStatus } from '../auth/AuthStatus';
import { useChat } from '../../../hooks/useChat';
import { Settings } from 'lucide-react';
import Link from 'next/link';

// interface ChatSidebarProps {
//   className?: string;
// }

export function ChatSidebar() {
  const { 
    chats, 
    activeChat, 
    loading, 
    selectChat, 
    createNewChat 
  } = useChat();

  const handleChatSelect = (chatId: string) => {
    selectChat(chatId);
  };

  const handleNewChat = () => {
    createNewChat();
  };

  const handleLogout = () => {
    // AuthStatus component handles the logout logic
  };

  return (
    <div className="flex flex-col h-full">
      {/* User Profile / Auth Status - Fixed at top */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-2">
          <AuthStatus 
            showLogout={true}
            onLogout={handleLogout}
            className="flex-1"
          />
          <Link 
            href="/dashboard/settings"
            className="p-2 hover:bg-accent rounded-lg transition-colors ml-2"
            title="Настройки"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* Chat List - Takes remaining space */}
      <div className="flex-1 overflow-hidden">
        <ChatList
          chats={chats}
          activeChat={activeChat}
          onChatSelect={handleChatSelect}
          onNewChat={handleNewChat}
          loading={loading.chats}
        />
      </div>
    </div>
  );
}