"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useToast } from './ToastContext';

export interface NotificationData {
  type: 'order_created' | 'order_updated' | 'order_cancelled' | 'payment_updated' | 'heartbeat' | 'connection';
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
  sellerName?: string;
  firstItemName?: string;
  status?: string;
  paymentStatus?: string;
  message: string;
  timestamp: string;
}

interface NotificationContextValue {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  reconnect: () => void;
  registerRefreshCallback: (callback: () => void) => () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
  userId?: string;
  userRole?: 'customer' | 'seller' | 'admin';
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  userId, 
  userRole 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [refreshCallbacks, setRefreshCallbacks] = useState<Set<() => void>>(new Set());
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const { showToast } = useToast();

  const registerRefreshCallback = (callback: () => void) => {
    setRefreshCallbacks(prev => new Set([...prev, callback]));
    
    // Return unregister function
    return () => {
      setRefreshCallbacks(prev => {
        const newSet = new Set(prev);
        newSet.delete(callback);
        return newSet;
      });
    };
  };

  const triggerRefresh = () => {
    refreshCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error executing refresh callback:', error);
      }
    });
  };

  const connect = useCallback(() => {
    if (!userId || !userRole) {
      console.log('SSE: No user ID or role provided, skipping connection');
      return;
    }

    // Don't attempt connection if already reconnecting
    if (isReconnecting) {
      return;
    }

    // Check if we're offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('SSE: Offline, will retry when online');
      return;
    }

    if (eventSource) {
      eventSource.close();
    }

    console.log('SSE: Connecting to notifications...', { userId, userRole, attempt: reconnectAttempts + 1 });
    setIsReconnecting(true);

    const es = new EventSource(`/api/notifications/sse?userId=${userId}&role=${userRole}`);
    
    es.onopen = () => {
      console.log('SSE: Connected to notifications');
      setIsConnected(true);
      setIsReconnecting(false);
      setReconnectAttempts(0); // Reset attempts on successful connection
    };

    es.onmessage = (event) => {
      try {
        const notification: NotificationData = JSON.parse(event.data);
        
        // Skip heartbeat messages
        if (notification.type === 'heartbeat' || notification.type === 'connection') {
          return;
        }
        
        console.log('SSE: Received notification:', notification);
        handleNotification(notification);
      } catch (error) {
        console.error('SSE: Error parsing notification:', error);
      }
    };

    es.onerror = (error) => {
      setIsConnected(false);
      setIsReconnecting(false);
      
      // Only log meaningful errors
      if (es.readyState === EventSource.CONNECTING) {
        // Connection is being established, this is normal
        console.log('SSE: Connecting...');
      } else if (es.readyState === EventSource.CLOSED) {
        // Connection was closed
        console.log('SSE: Connection closed, will attempt to reconnect');
        
        // Implement exponential backoff for reconnection
        const maxAttempts = 5;
        const baseDelay = 2000; // Start with 2 seconds
        
        if (reconnectAttempts < maxAttempts) {
          const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts), 30000); // Max 30 seconds
          
          setTimeout(() => {
            if (es.readyState === EventSource.CLOSED) {
              setReconnectAttempts(prev => prev + 1);
              connect();
            }
          }, delay);
        } else {
          console.warn('SSE: Max reconnection attempts reached. Please refresh the page.');
          // Optionally show a user-friendly message
          showToast({
            type: 'warning',
            title: 'Connection Issue',
            message: 'Real-time notifications are temporarily unavailable. Please refresh the page.',
          });
        }
      } else {
        // Unexpected error
        console.error('SSE: Unexpected connection error:', error);
      }
    };

    setEventSource(es);
  }, [userId, userRole, isReconnecting, eventSource, reconnectAttempts, showToast]);

  const handleNotification = useCallback((notification: NotificationData) => {
    // Skip system messages
    if (notification.type === 'heartbeat' || notification.type === 'connection') {
      return;
    }

    const getToastConfig = () => {
      switch (notification.type) {
        case 'order_created':
          if (userRole === 'seller') {
            return {
              type: 'info' as const,
              title: 'New Order Received',
              message: `${notification.customerName} placed an order for ${notification.firstItemName}${notification.orderNumber ? ` (Order #${notification.orderNumber})` : ''}`,
              action: {
                label: 'View Order',
                onClick: () => window.location.href = `/seller/orders/${notification.orderId}`
              }
            };
          }
          return {
            type: 'success' as const,
            title: 'Order Created Successfully',
            message: `Your order for ${notification.firstItemName} has been placed successfully`,
            action: {
              label: 'View Order',
              onClick: () => window.location.href = `/customer/orders/${notification.orderId}`
            }
          };

        case 'order_updated':
          if (userRole === 'customer') {
            return {
              type: 'info' as const,
              title: 'Order Status Updated',
              message: `Your order for ${notification.firstItemName} is now ${notification.status}`,
              action: {
                label: 'View Order',
                onClick: () => window.location.href = `/customer/orders/${notification.orderId}`
              }
            };
          }
          return {
            type: 'success' as const,
            title: 'Order Updated',
            message: `Order ${notification.orderNumber || notification.orderId} status updated to ${notification.status}`,
          };

        case 'order_cancelled':
          return {
            type: 'warning' as const,
            title: 'Order Cancelled',
            message: `Order for ${notification.firstItemName} has been cancelled`,
            action: {
              label: 'View Orders',
              onClick: () => window.location.href = userRole === 'customer' ? '/customer/orders' : '/seller/orders'
            }
          };

        case 'payment_updated':
          if (userRole === 'customer') {
            return {
              type: 'info' as const,
              title: 'Payment Status Updated',
              message: `Payment for your order is now ${notification.paymentStatus}`,
              action: {
                label: 'View Order',
                onClick: () => window.location.href = `/customer/orders/${notification.orderId}`
              }
            };
          }
          return {
            type: 'info' as const,
            title: 'Payment Updated',
            message: `Payment status updated for order ${notification.orderNumber || notification.orderId}`,
          };

        default:
          return {
            type: 'info' as const,
            title: 'Notification',
            message: notification.message,
          };
      }
    };

    showToast(getToastConfig());
    
    // Trigger refresh for relevant pages
    setTimeout(() => {
      triggerRefresh();
    }, 500); // Small delay to ensure toast is shown first
  }, [userRole, showToast, triggerRefresh]);

  const reconnect = () => {
    setReconnectAttempts(0); // Reset attempts for manual reconnection
    connect();
  };

  // Handle network state changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('SSE: Network is back online, attempting to reconnect');
      if (!isConnected && userId && userRole) {
        setReconnectAttempts(0);
        connect();
      }
    };

    const handleOffline = () => {
      console.log('SSE: Network is offline');
      if (eventSource) {
        eventSource.close();
      }
      setIsConnected(false);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [isConnected, userId, userRole, eventSource]);

  useEffect(() => {
    if (userId && userRole) {
      connect();
    }

    return () => {
      if (eventSource) {
        console.log('SSE: Disconnecting from notifications');
        eventSource.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userRole]);

  return (
    <NotificationContext.Provider value={{ 
      isConnected, 
      isReconnecting, 
      reconnectAttempts, 
      reconnect, 
      registerRefreshCallback 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
