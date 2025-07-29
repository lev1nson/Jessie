'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { Button } from './button';

interface RateLimitAlertProps {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  cooldownSeconds?: number;
}

export function RateLimitAlert({ 
  message, 
  onDismiss, 
  onRetry,
  cooldownSeconds = 60 
}: RateLimitAlertProps) {
  const [remainingTime, setRemainingTime] = useState(cooldownSeconds);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isActive || remainingTime <= 0) return;

    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, remainingTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
      <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
          Rate limit exceeded
        </p>
        <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
          {message}
        </p>
        
        {isActive && remainingTime > 0 && (
          <div className="flex items-center gap-2 mt-2 text-xs text-orange-600 dark:text-orange-400">
            <Clock className="h-3 w-3" />
            <span>Please wait {formatTime(remainingTime)} before trying again</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {!isActive && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/50"
          >
            Try again
          </Button>
        )}
        
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200"
          >
            ×
          </Button>
        )}
      </div>
    </div>
  );
}