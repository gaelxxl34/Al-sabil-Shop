// src/app/api/notifications/sse/route.ts
import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

// Store active connections
const connections = new Map<string, {
  controller: ReadableStreamDefaultController;
  userId: string;
  userRole: string;
}>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const userRole = searchParams.get('role');

  if (!userId || !userRole) {
    return new Response('Missing userId or role', { status: 400 });
  }

  // Verify authentication using session cookie
  const sessionCookie = request.cookies.get('session');
  if (!sessionCookie?.value) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true);
    
    if (!decodedToken || decodedToken.uid !== userId) {
      return new Response('Invalid session', { status: 401 });
    }
  } catch (error) {
    console.error('SSE: Auth verification failed:', error);
    return new Response('Unauthorized', { status: 401 });
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Store connection
      const connectionId = `${userId}_${Date.now()}`;
      connections.set(connectionId, {
        controller,
        userId,
        userRole,
      });

      console.log(`SSE: Client connected - ${connectionId} (${userRole})`);

      // Send initial connection message
      const data = JSON.stringify({
        type: 'connection',
        message: 'Connected to notifications',
        timestamp: new Date().toISOString(),
      });
      
      controller.enqueue(`data: ${data}\n\n`);

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
        } catch (error) {
          console.log(`SSE: Heartbeat failed for ${connectionId}, cleaning up`);
          clearInterval(heartbeat);
          connections.delete(connectionId);
        }
      }, 30000); // Send heartbeat every 30 seconds

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        console.log(`SSE: Client disconnected - ${connectionId}`);
        clearInterval(heartbeat);
        connections.delete(connectionId);
        try {
          controller.close();
        } catch (error) {
          // Controller already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Helper function to broadcast notifications to specific users
export function broadcastNotification(notification: {
  type: string;
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  sellerName?: string;
  firstItemName?: string;
  status?: string;
  paymentStatus?: string;
  message: string;
  targetUserId?: string;
  targetRole?: string;
}) {
  const data = JSON.stringify({
    ...notification,
    timestamp: new Date().toISOString(),
  });

  let sentCount = 0;

  connections.forEach((connection, connectionId) => {
    // Send to specific user if targetUserId is specified
    if (notification.targetUserId && connection.userId !== notification.targetUserId) {
      return;
    }

    // Send to specific role if targetRole is specified
    if (notification.targetRole && connection.userRole !== notification.targetRole) {
      return;
    }

    try {
      connection.controller.enqueue(`data: ${data}\n\n`);
      sentCount++;
    } catch (error) {
      console.error(`SSE: Failed to send notification to ${connectionId}:`, error);
      connections.delete(connectionId);
    }
  });

  console.log(`SSE: Notification sent to ${sentCount} connections:`, notification.type);
}
