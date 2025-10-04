// src/types/firestore.ts

import { DocumentData, QueryDocumentSnapshot, DocumentSnapshot } from 'firebase-admin/firestore';

export interface FirestoreDocument {
  id: string;
  [key: string]: unknown;
}

export interface FirestoreDocumentSnapshot extends DocumentSnapshot {
  data(): DocumentData | undefined;
}

export interface FirestoreQueryDocumentSnapshot extends QueryDocumentSnapshot {
  data(): DocumentData;
}

export interface FirestoreUpdateData {
  [fieldPath: string]: unknown;
}

export interface FirestoreUserData extends DocumentData {
  uid: string;
  email: string;
  role: 'admin' | 'seller' | 'customer';
  displayName?: string;
  isActive?: boolean;
  sellerId?: string;
  businessName?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface FirestoreConversationData extends DocumentData {
  participants: string[];
  participantRoles: { [userId: string]: string };
  participantNames?: { [userId: string]: string };
  type: string;
  orderId?: string;
  subject: string;
  lastMessage: {
    text: string;
    senderId: string;
    timestamp: number;
  };
  unreadCount: { [userId: string]: number };
  status: string;
  createdAt: number;
  updatedAt: number;
}

export interface FirestoreMessageData extends DocumentData {
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  type: string;
  attachments?: unknown[];
  isRead: boolean;
  readBy: string[];
  timestamp: number;
  createdAt: number;
}