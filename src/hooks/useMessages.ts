// src/hooks/useMessages.ts
import { useEffect, useState, useRef, useCallback } from 'react';
import { Message } from '@/types/conversation';
import { playNotificationSound } from '@/lib/sound-notifications';

export function useMessages(conversationId: string | null, currentUserId: string | null, limitCount: number = 50) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isFirstLoad = useRef(true);
  const previousMessageIds = useRef(new Set<string>());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setLoading(false);
      setMessages([]);
      return;
    }

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages?limit=${limitCount}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      
      if (data.success && data.messages) {
        const messageList: Message[] = data.messages.reverse(); // API returns desc, we want asc
        const newMessageIds = new Set<string>();
        
        messageList.forEach((message) => {
          newMessageIds.add(message.id);
        });

        // Detect truly new messages (not from initial load, not from current user)
        if (!isFirstLoad.current) {
          messageList.forEach((message) => {
            // Only play sound for messages from other users that we haven't seen
            if (message.senderId !== currentUserId && !previousMessageIds.current.has(message.id)) {
              playNotificationSound('new-message');
            }
          });
        }

        previousMessageIds.current = newMessageIds;
        setMessages(messageList);
        setLoading(false);
        setError(null);
        isFirstLoad.current = false;
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [conversationId, currentUserId, limitCount]);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      setMessages([]);
      return;
    }

    // Reset on conversation change
    isFirstLoad.current = true;
    previousMessageIds.current.clear();

    // Initial fetch
    fetchMessages();

    // Set up polling interval (every 3 seconds for chat)
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      isFirstLoad.current = true;
      previousMessageIds.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUserId, limitCount]);

  return { messages, loading, error, connected: true }; // Always connected with polling
}
