"use client";

import React from 'react';
import { useNotification } from '@/contexts/NotificationContext';

interface NotificationStatusProps {
  showReconnectButton?: boolean;
  className?: string;
}

export const NotificationStatus: React.FC<NotificationStatusProps> = ({ 
  showReconnectButton = true,
  className = ''
}) => {
  const { isConnected, isReconnecting, reconnectAttempts, reconnect } = useNotification();

  if (isConnected) {
    return (
      <div className={`flex items-center space-x-2 text-green-600 ${className}`}>
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm">Connected</span>
      </div>
    );
  }

  if (isReconnecting) {
    return (
      <div className={`flex items-center space-x-2 text-yellow-600 ${className}`}>
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        <span className="text-sm">
          Reconnecting... {reconnectAttempts > 0 && `(Attempt ${reconnectAttempts + 1})`}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
      <span className="text-sm">Disconnected</span>
      {showReconnectButton && (
        <button
          onClick={reconnect}
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
        >
          Reconnect
        </button>
      )}
    </div>
  );
};

export default NotificationStatus;
