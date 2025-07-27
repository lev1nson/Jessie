'use client';

import { formatDistanceToNow, format } from 'date-fns';
import { User, Bot, Mail, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Message } from './ChatMessages';

interface MessageItemProps {
  message: Message;
  isLast?: boolean;
}

export function MessageItem({ message }: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const timeAgo = formatDistanceToNow(message.createdAt, { addSuffix: true });
  const fullTime = format(message.createdAt, 'PPpp');

  return (
    <div className={`flex gap-3 md:gap-4 group ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary flex items-center justify-center">
          <Bot className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
        </div>
      )}

      {/* Message Content */}
      <div className={`max-w-[85%] md:max-w-[70%] ${isUser ? 'order-first' : ''}`}>
        {/* Message Header */}
        <div className={`flex items-center gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs font-medium text-muted-foreground">
            {isUser ? 'You' : 'Jessie'}
          </span>
          <span className="text-xs text-muted-foreground" title={fullTime}>
            {timeAgo}
          </span>
        </div>

        {/* Message Bubble */}
        <div
          className={`
            relative p-4 rounded-2xl shadow-sm border transition-all duration-200
            ${isUser 
              ? 'bg-primary text-primary-foreground border-primary/20' 
              : 'bg-card text-card-foreground border-border/50 hover:border-border'
            }
          `}
        >
          {/* Message Text */}
          <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>

          {/* Source Emails Indicator */}
          {!isUser && message.sourceEmailIds && message.sourceEmailIds.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="w-3 h-3" />
                <span>
                  Based on {message.sourceEmailIds.length} email{message.sourceEmailIds.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Copy Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className={`
              absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 
              transition-opacity duration-200 hover:bg-background/10
              ${isUser ? 'text-primary-foreground hover:text-primary-foreground' : ''}
            `}
            title="Copy message"
          >
            {copied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-muted flex items-center justify-center">
          <User className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}