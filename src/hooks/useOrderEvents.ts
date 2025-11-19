'use client';

import { useEffect, useRef } from 'react';
import type { Order } from '@/types/cart';
import type { OrderEventPayload } from '@/lib/order-events';

interface UseOrderEventsOptions {
  enabled: boolean;
  onEvent?: (payload: OrderEventPayload) => void;
  onOrderCreated?: (order: Order, payload: OrderEventPayload) => void;
  onOrderUpdated?: (order: Order, payload: OrderEventPayload) => void;
}

export function useOrderEvents({
  enabled,
  onEvent,
  onOrderCreated,
  onOrderUpdated,
}: UseOrderEventsOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const orderEventListenerRef = useRef<((event: MessageEvent) => void) | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return;
    }

    let isShuttingDown = false;

    const connect = () => {
      if (eventSourceRef.current || isShuttingDown) {
        return;
      }

      const eventSource = new EventSource('/api/events/orders', { withCredentials: true });
      eventSourceRef.current = eventSource;

      const handleOrderEvent = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data) as OrderEventPayload;
          onEvent?.(payload);

          if (payload.type === 'order.created') {
            onOrderCreated?.(payload.order, payload);
          } else if (payload.type === 'order.updated') {
            onOrderUpdated?.(payload.order, payload);
          }
        } catch (error) {
          console.error('Failed to parse order event:', error);
        }
      };

      orderEventListenerRef.current = handleOrderEvent;
      eventSource.addEventListener('order-event', handleOrderEvent);

      eventSource.onerror = () => {
        if (orderEventListenerRef.current) {
          eventSource.removeEventListener('order-event', orderEventListenerRef.current);
          orderEventListenerRef.current = null;
        }
        eventSource.close();
        eventSourceRef.current = null;
        if (!isShuttingDown && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 5000);
        }
      };
    };

    connect();

    return () => {
      isShuttingDown = true;
      if (eventSourceRef.current) {
        if (orderEventListenerRef.current) {
          eventSourceRef.current.removeEventListener('order-event', orderEventListenerRef.current);
          orderEventListenerRef.current = null;
        }
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [enabled, onEvent, onOrderCreated, onOrderUpdated]);
}
