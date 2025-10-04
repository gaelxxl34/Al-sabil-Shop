import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Simplified typing indicator using local state only
 * For real-time typing, we'd need server-side WebSocket or a different approach
 * This provides a good UX without Firestore subcollections
 */
export function useTypingIndicator(
  conversationId: string | null,
  userId: string | null
) {
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Send typing indicator - for now, just a no-op that could be extended via API
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !userId) return;

    try {
      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (isTyping) {
        // Auto-clear typing indicator after 3 seconds
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false);
        }, 3000);
        
        // Optional: Could send to API endpoint for real-time sync
        // await fetch(`/api/conversations/${conversationId}/typing`, {
        //   method: 'POST',
        //   body: JSON.stringify({ isTyping: true })
        // });
      }
    } catch (error) {
      console.error('Error setting typing indicator:', error);
    }
  }, [conversationId, userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { setTyping };
}

/**
 * Hook to listen for other users typing
 * Returns false for now - can be extended with API polling or WebSocket
 */
export function useOthersTyping() {
  const [isOtherTyping] = useState(false);

  // For now, return false
  // Can be extended with API polling if needed:
  // useEffect(() => {
  //   if (!conversationId) return;
  //   const interval = setInterval(async () => {
  //     const res = await fetch(`/api/conversations/${conversationId}/typing`);
  //     const data = await res.json();
  //     setIsOtherTyping(data.isTyping);
  //   }, 2000);
  //   return () => clearInterval(interval);
  // }, [conversationId]);

  return isOtherTyping;
}

