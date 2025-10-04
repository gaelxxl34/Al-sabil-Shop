// src/hooks/useConversations.ts
import { useEffect, useState, useRef, useCallback } from 'react';
import { Conversation } from '@/types/conversation';

export function useConversations(userId: string | null, options?: {
  status?: string;
  type?: string;
  limitCount?: number;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (options?.status) params.append('status', options.status);
      if (options?.type) params.append('type', options.type);
      if (options?.limitCount) params.append('limit', options.limitCount.toString());
      
      const response = await fetch(`/api/conversations?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      
      if (data.success && data.conversations) {
        setConversations(data.conversations);
        setLoading(false);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [userId, options?.status, options?.type, options?.limitCount]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchConversations();

    // Set up polling interval (every 5 seconds)
    pollingIntervalRef.current = setInterval(() => {
      fetchConversations();
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [userId, options?.status, options?.type, options?.limitCount]);

  return { conversations, loading, error };
}
