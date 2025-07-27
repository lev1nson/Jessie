'use client';

import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Clock } from 'lucide-react';
import { Chat } from './ChatList';

interface ChatItemProps {
  chat: Chat;
  isActive?: boolean;
  onClick?: () => void;
  index?: number;
  onKeyDown?: (e: React.KeyboardEvent, index: number) => void;
}

export function ChatItem({ 
  chat, 
  isActive = false, 
  onClick, 
  index = 0,
  onKeyDown 
}: ChatItemProps) {
  const timeAgo = formatDistanceToNow(chat.updatedAt, { addSuffix: true });

  return (
    <div
      onClick={onClick}
      className={`
        group relative p-3 rounded-lg cursor-pointer transition-all duration-200
        hover:bg-accent/50 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/50
        ${isActive 
          ? 'bg-primary/10 border border-primary/20 shadow-sm' 
          : 'hover:shadow-sm'
        }
      `}
      role="button"
      tabIndex={0}
      data-chat-item={index}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        } else if (onKeyDown) {
          onKeyDown(e, index);
        }
      }}
      aria-label={`Chat: ${chat.title}${isActive ? ' (currently active)' : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Active Indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
      )}

      <div className="flex items-start gap-3">
        {/* Chat Icon */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200
          ${isActive 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted group-hover:bg-muted-foreground/10'
          }
        `}>
          <MessageCircle className="h-4 w-4" />
        </div>

        {/* Chat Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className={`
              text-sm font-medium truncate transition-colors duration-200
              ${isActive ? 'text-primary' : 'text-foreground group-hover:text-foreground/90'}
            `}>
              {chat.title}
            </h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0 ml-2">
              <Clock className="h-3 w-3" />
              <span title={chat.updatedAt.toLocaleString()}>
                {timeAgo}
              </span>
            </div>
          </div>
          
          {chat.lastMessage && (
            <p className="text-xs text-muted-foreground truncate leading-relaxed">
              {chat.lastMessage}
            </p>
          )}
        </div>
      </div>

      {/* Hover Effect */}
      <div className={`
        absolute inset-0 rounded-lg transition-opacity duration-200 pointer-events-none
        ${isActive 
          ? 'bg-primary/5 opacity-100' 
          : 'bg-accent/20 opacity-0 group-hover:opacity-100'
        }
      `} />
    </div>
  );
}