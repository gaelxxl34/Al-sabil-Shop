"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useToast } from './ToastContext';

export interface NotificationData {
  type: 'order_created' | 'order_updated' | 'order_cancelled' | 'payment_updated';
  orderId: string;
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

  const connect = () => {
    if (!userId || !userRole) {
      console.log('SSE: No user ID or role provided, skipping connection');
      return;
    }

    if (eventSource) {
      eventSource.close();
    }

    console.log('SSE: Connecting to notifications...', { userId, userRole });

    const es = new EventSource(`/api/notifications/sse?userId=${userId}&role=${userRole}`);
    
    es.onopen = () => {
      console.log('SSE: Connected to notifications');
      setIsConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const notification: NotificationData = JSON.parse(event.data);
        console.log('SSE: Received notification:', notification);
        
        handleNotification(notification);
      } catch (error) {
        console.error('SSE: Error parsing notification:', error);
      }
    };

    es.onerror = (error) => {
      console.error('SSE: Connection error:', error);
      setIsConnected(false);
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (es.readyState === EventSource.CLOSED) {
          connect();
        }
      }, 5000);
    };

    setEventSource(es);
  };

  const handleNotification = (notification: NotificationData) => {
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
  };

  const reconnect = () => {
    connect();
  };

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
  }, [userId, userRole]);

  return (
    <NotificationContext.Provider value={{ isConnected, reconnect, registerRefreshCallback }}>
      {children}
    </NotificationContext.Provider>
  );
};
