// src/types/notification.ts

export type NotificationType = 
  | 'new-message'
  | 'order-update'
  | 'stock-alert'
  | 'order-placed'
  | 'order-fulfilled'
  | 'order-partial-fulfilled'
  | 'order-cancelled';

export interface NotificationData {
  conversationId?: string;
  orderId?: string;
  actionUrl?: string;
  metadata?: {
    orderNumber?: string;
    customerName?: string;
    productName?: string;
    stockLevel?: number;
    amount?: number;
    [key: string]: string | number | boolean | undefined;
  };
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData;
  isRead: boolean;
  isPushed: boolean;
  createdAt: number;
  expiresAt?: number;
}

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: NotificationData;
  expiresAt?: number;
}

export interface NotificationPreferences {
  enableSound: boolean;
  enablePush: boolean;
  enableInApp: boolean;
  soundVolume: number; // 0-1
  muteUntil?: number; // Timestamp
}

export interface FCMTokenData {
  token: string;
  userId: string;
  device: string; // 'web' | 'mobile'
  createdAt: number;
  lastUsed: number;
}
