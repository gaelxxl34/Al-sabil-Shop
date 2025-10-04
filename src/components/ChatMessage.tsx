'use client';

import { Message } from '@/types/conversation';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'failed';

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
  showSenderName?: boolean;
  status?: MessageStatus;
  isOptimistic?: boolean;
}

export default function ChatMessage({
  message,
  isCurrentUser,
  showSenderName = false,
  status = 'delivered',
  isOptimistic = false
}: ChatMessageProps) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = () => {
    if (isOptimistic || status === 'sending') {
      return (
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
      );
    }
    
    if (status === 'sent') {
      return (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      );
    }

    if (status === 'delivered') {
      return (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 13l4 4L22 7" />
        </svg>
      );
    }

    if (status === 'failed') {
      return (
        <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }

    return null;
  };

  return (
    <div
      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-2 animate-fade-in`}
    >
      <div className={`max-w-[75%] ${isOptimistic ? 'opacity-80' : ''}`}>
        <div
          className={`rounded-lg px-3 py-2 shadow-sm transition-all ${
            isCurrentUser
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
          } ${status === 'failed' ? 'border-red-300' : ''}`}
        >
          {showSenderName && !isCurrentUser && (
            <p className="text-xs font-semibold mb-1 opacity-75">
              {message.senderName}
            </p>
          )}
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {message.text}
          </p>
          <div
            className={`flex items-center justify-end gap-1 mt-1 text-xs ${
              isCurrentUser ? 'text-blue-100' : 'text-gray-400'
            }`}
          >
            <span>{formatTime(message.timestamp)}</span>
            {isCurrentUser && (
              <span className="flex items-center">
                {getStatusIcon()}
              </span>
            )}
          </div>
        </div>
        {status === 'failed' && isCurrentUser && (
          <div className="text-xs text-red-500 mt-1 text-right">
            Failed to send • Tap to retry
          </div>
        )}
      </div>
    </div>
  );
}
