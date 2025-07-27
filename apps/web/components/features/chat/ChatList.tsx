'use client';

import { useState, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import { ChatItem } from './ChatItem';

export interface Chat {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt: Date;
  isActive?: boolean;
}

interface ChatListProps {
  chats?: Chat[];
  activeChat?: string;
  onChatSelect?: (chatId: string) => void;
  onNewChat?: () => void;
  loading?: boolean;
}

export function ChatList({ 
  chats = [], 
  activeChat, 
  onChatSelect, 
  onNewChat,
  loading = false 
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex] = useState(-1);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    
    const query = searchQuery.toLowerCase();
    return chats.filter(chat => 
      chat.title.toLowerCase().includes(query) ||
      chat.lastMessage?.toLowerCase().includes(query)
    );
  }, [chats, searchQuery]);

  const handleKeyNavigation = (e: React.KeyboardEvent, index: number) => {
    const maxIndex = filteredChats.length - 1;
    let nextIndex = index;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = Math.min(index + 1, maxIndex);
        break;
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = Math.max(index - 1, 0);
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = maxIndex;
        break;
      default:
        return;
    }

    setFocusedIndex(nextIndex);
    const nextItem = document.querySelector(`[data-chat-item="${nextIndex}"]`) as HTMLElement;
    nextItem?.focus();
  };

  // Virtualized list item renderer
  const ChatItemRenderer = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const chat = filteredChats[index];
    return (
      <div style={style}>
        <div className="px-2 pb-1">
          <ChatItem
            chat={chat}
            isActive={chat.id === activeChat}
            onClick={() => onChatSelect?.(chat.id)}
            index={index}
            onKeyDown={handleKeyNavigation}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with New Chat Button */}
      <div className="p-4 border-b border-border">
        <Button 
          onClick={onNewChat}
          className="w-full justify-start gap-2 transition-all duration-200 hover:scale-[1.02]"
          size="lg"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && filteredChats.length > 0) {
                e.preventDefault();
                setFocusedIndex(0);
                // Focus first chat item
                const firstItem = document.querySelector('[data-chat-item="0"]') as HTMLElement;
                firstItem?.focus();
              }
            }}
            className="pl-10 transition-all duration-200 focus:ring-2"
            aria-label="Search chats"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredChats.length > 0 ? (
            filteredChats.length > 20 ? (
              // Use virtualization for large lists (>20 items)
              <List
                height={400} // Will be calculated dynamically in real implementation
                width="100%"
                itemCount={filteredChats.length}
                itemSize={76} // Height of each chat item
                className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
              >
                {ChatItemRenderer}
              </List>
            ) : (
              // Regular rendering for small lists
              <div className="space-y-1" role="listbox" aria-label="Chat list">
                {filteredChats.map((chat, index) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === activeChat}
                    onClick={() => onChatSelect?.(chat.id)}
                    index={index}
                    onKeyDown={handleKeyNavigation}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              {searchQuery ? (
                <div className="text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-foreground mb-2">No chats found</h3>
                  <p className="text-xs text-muted-foreground">
                    Try adjusting your search terms
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground mb-2">No chats yet</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Start a conversation to see your chats here
                  </p>
                  <Button 
                    onClick={onNewChat}
                    size="sm"
                    className="transition-all duration-200 hover:scale-105"
                  >
                    Start your first chat
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}