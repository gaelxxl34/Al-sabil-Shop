// src/hooks/useUnreadMessages.ts
import { useEffect, useRef } from 'react';
import { playNotificationSound } from '@/lib/sound-notifications';

/**
 * Hook to track unread message counts and play sounds
 * Works for both customers and sellers, even when chat is closed
 */
export function useUnreadMessages(
  userId: string | null,
  userRole: string | undefined,
  currentUnreadCount: number
) {
  const previousUnreadCount = useRef<number>(0);
  const isFirstCheck = useRef(true);

  useEffect(() => {
    // Skip first load to avoid playing sound on initial page load
    if (isFirstCheck.current) {
      previousUnreadCount.current = currentUnreadCount;
      isFirstCheck.current = false;
      return;
    }

    // If unread count increased, play notification sound
    if (currentUnreadCount > previousUnreadCount.current) {
      playNotificationSound('new-message');
    }

    previousUnreadCount.current = currentUnreadCount;
  }, [currentUnreadCount]);

  // Reset when user changes
  useEffect(() => {
    isFirstCheck.current = true;
    previousUnreadCount.current = 0;
  }, [userId]);
}
