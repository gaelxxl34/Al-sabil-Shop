// src/components/NotificationBell.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FiBell } from "react-icons/fi";
import { useAuth } from "@/components/AuthProvider";
import { Notification } from "@/types/notification";
import { playNotificationSound } from "@/lib/sound-notifications";

export default function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const previousNotificationIds = useRef(new Set<string>());
  const isFirstLoad = useRef(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/notifications?limit=50');
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      
      if (data.success && data.notifications) {
        const notifs: Notification[] = data.notifications;
        
        // Detect new notifications (not from initial load)
        if (!isFirstLoad.current) {
          notifs.forEach((notif) => {
            // Only play sound for new unread notifications
            if (!notif.isRead && !previousNotificationIds.current.has(notif.id)) {
              // Play different sounds based on notification type
              if (notif.type === 'new-message') {
                playNotificationSound('new-message');
              } else if (notif.type.includes('order')) {
                playNotificationSound('order-update');
              } else if (notif.type === 'stock-alert') {
                playNotificationSound('stock-alert');
              }
            }
          });
        }

        // Update previous notification IDs
        previousNotificationIds.current = new Set(notifs.map(n => n.id));
        
        setNotifications(notifs);
        setLoading(false);
        isFirstLoad.current = false;
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    }
  }, [user?.uid]);

  // Polling effect - fetch notifications every 5 seconds
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // Reset on user change
    isFirstLoad.current = true;
    previousNotificationIds.current.clear();

    // Initial fetch
    fetchNotifications();

    // Set up polling interval (every 5 seconds)
    pollingIntervalRef.current = setInterval(() => {
      fetchNotifications();
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      isFirstLoad.current = true;
      previousNotificationIds.current.clear();
    };
  }, [user?.uid, fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds: [notificationId],
          markAsRead: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Update local state immediately for better UX
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }

    // For message notifications, just close dropdown (user can use floating chat)
    if (notification.type === 'new-message') {
      setShowDropdown(false);
      return;
    }

    // Navigate to action URL or default location
    if (notification.data?.actionUrl && !notification.data.actionUrl.includes('/messages/')) {
      router.push(notification.data.actionUrl);
    } else if (notification.data?.orderId) {
      router.push(`/customer/orders/${notification.data.orderId}`);
    }

    setShowDropdown(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new-message':
        return '💬';
      case 'order-update':
      case 'order-placed':
      case 'order-fulfilled':
      case 'order-partial-fulfilled':
        return '📦';
      case 'stock-alert':
        return '⚠️';
      case 'order-cancelled':
        return '❌';
      default:
        return '🔔';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    
    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    // Less than 1 hour
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    // Less than 1 day
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    // Less than 7 days
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    // Older - show date
    return date.toLocaleDateString();
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none transition-colors"
        aria-label="Notifications"
      >
        <FiBell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full animate-gentle-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl z-20 max-h-[32rem] overflow-hidden animate-slideUp">
            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-white">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-sm text-blue-600 font-medium">{unreadCount} unread</p>
              )}
            </div>

            <div className="overflow-y-auto max-h-[28rem]">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-base font-medium mb-1">No notifications yet</p>
                  <p className="text-sm">We&apos;ll notify you when something arrives</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.slice(0, 10).map((notification, index) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors animate-fade-in ${
                        !notification.isRead ? 'bg-blue-50 hover:bg-blue-100' : ''
                      }`}
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium text-gray-900 truncate ${!notification.isRead ? 'font-semibold' : ''}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                            {notification.body}
                          </p>
                          <p className="text-xs text-gray-500 mt-1.5">
                            {formatTimestamp(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 10 && (
              <div className="p-4 border-t text-center bg-gray-50">
                <button
                  onClick={() => {
                    router.push('/notifications');
                    setShowDropdown(false);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  View all {notifications.length} notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
