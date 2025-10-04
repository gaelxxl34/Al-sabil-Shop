// src/types/conversation.ts

export type ConversationType = 'order-inquiry' | 'general' | 'support' | 'stock-alert';
export type ConversationStatus = 'active' | 'resolved' | 'archived';
export type MessageType = 'text' | 'system' | 'order-update' | 'stock-alert';

export interface StockIssue {
  productId: string;
  productName: string;
  requested: number;
  available: number;
  pending: number;
}

export interface ConversationMetadata {
  orderNumber?: string;
  productIds?: string[];
  stockIssues?: StockIssue[];
}

export interface LastMessage {
  text: string;
  senderId: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  participants: string[]; // Array of userIds
  participantRoles: {
    [userId: string]: 'admin' | 'seller' | 'customer';
  };
  participantNames?: {
    [userId: string]: string;
  };
  type: ConversationType;
  orderId?: string;
  subject: string;
  lastMessage: LastMessage;
  unreadCount: {
    [userId: string]: number;
  };
  status: ConversationStatus;
  createdAt: number;
  updatedAt: number;
  metadata?: ConversationMetadata;
}

export interface MessageAttachment {
  type: 'order-details' | 'stock-info';
  data: OrderDetailsAttachment | StockInfoAttachment;
}

export interface OrderDetailsAttachment {
  orderId: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
}

export interface StockInfoAttachment {
  productId: string;
  productName: string;
  currentStock: number;
  requestedQuantity: number;
  availableQuantity: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'seller' | 'customer';
  text: string;
  type: MessageType;
  attachments?: MessageAttachment[];
  isRead: boolean;
  readBy: string[];
  timestamp: number;
  createdAt: number;
}

export interface CreateConversationData {
  participantIds: string[];
  participantRoles: {
    [userId: string]: 'admin' | 'seller' | 'customer';
  };
  type: ConversationType;
  orderId?: string;
  subject: string;
  metadata?: ConversationMetadata;
  initialMessage?: string;
}

export interface CreateMessageData {
  conversationId: string;
  text: string;
  type?: MessageType;
  attachments?: MessageAttachment[];
}

export interface ConversationWithLastMessageDetails extends Conversation {
  lastMessageSenderName?: string;
  lastMessagePreview?: string;
}
