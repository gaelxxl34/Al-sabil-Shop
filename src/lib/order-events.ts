import { EventEmitter } from 'events';
import type { Order } from '@/types/cart';

export type OrderEventType = 'order.created' | 'order.updated';

export interface OrderEventPayload {
  type: OrderEventType;
  order: Order;
  timestamp: string;
}

type OrderEventCallback = (payload: OrderEventPayload) => void;

const ORDER_EVENT_CHANNEL = 'order-event';

declare global {
  var __orderEventEmitter: EventEmitter | undefined;
}

const emitter: EventEmitter = globalThis.__orderEventEmitter ?? new EventEmitter();
if (!globalThis.__orderEventEmitter) {
  emitter.setMaxListeners(150);
  globalThis.__orderEventEmitter = emitter;
}

export function emitOrderEvent(payload: OrderEventPayload) {
  emitter.emit(ORDER_EVENT_CHANNEL, payload);
}

export function subscribeToOrderEvents(callback: OrderEventCallback) {
  emitter.on(ORDER_EVENT_CHANNEL, callback);
  return () => {
    emitter.off(ORDER_EVENT_CHANNEL, callback);
  };
}
