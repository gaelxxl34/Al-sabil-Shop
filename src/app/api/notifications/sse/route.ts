// src/app/api/notifications/sse/route.ts
import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { notificationManager } from '@/lib/notifications';

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
      notificationManager.addConnection(connectionId, {
        controller,
        userId,
        userRole,
      });

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
        } catch {
          console.log(`SSE: Heartbeat failed for ${connectionId}, cleaning up`);
          clearInterval(heartbeat);
          notificationManager.removeConnection(connectionId);
        }
      }, 30000); // Send heartbeat every 30 seconds

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        console.log(`SSE: Client disconnected - ${connectionId}`);
        clearInterval(heartbeat);
        notificationManager.removeConnection(connectionId);
        try {
          controller.close();
        } catch {
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

