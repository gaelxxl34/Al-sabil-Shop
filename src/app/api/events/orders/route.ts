import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { subscribeToOrderEvents } from '@/lib/order-events';
import type { OrderEventPayload } from '@/lib/order-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AuthResult {
  authenticated: boolean;
  user: { uid: string; role: string } | null;
}

async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      return { authenticated: false, user: null };
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie.value, true);
    if (!decoded?.uid) {
      return { authenticated: false, user: null };
    }

    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      return { authenticated: false, user: null };
    }

    const data = userDoc.data();
    if (!data?.role || data?.isActive === false) {
      return { authenticated: false, user: null };
    }

    return {
      authenticated: true,
      user: {
        uid: decoded.uid,
        role: data.role,
      },
    };
  } catch (error) {
    console.error('SSE auth error:', error);
    return { authenticated: false, user: null };
  }
}

function createEventStream(authUser: { uid: string; role: string }) {
  let keepAliveTimer: NodeJS.Timeout | null = null;
  let unsubscribe: (() => void) | null = null;
  const encoder = new TextEncoder();

  const cleanup = () => {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      sendEvent('connected', {
        timestamp: new Date().toISOString(),
      });

      keepAliveTimer = setInterval(() => {
        controller.enqueue(encoder.encode(': keep-alive\n\n'));
      }, 25000);

      unsubscribe = subscribeToOrderEvents((payload: OrderEventPayload) => {
        const { order } = payload;
        if (authUser.role === 'seller' && order.sellerId !== authUser.uid) {
          return;
        }
        if (authUser.role === 'customer' && order.customerId !== authUser.uid) {
          return;
        }
        sendEvent('order-event', payload);
      });
    },
    cancel() {
      cleanup();
    },
  });

  return { stream, cleanup };
}

export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { stream, cleanup } = createEventStream(authResult.user);

  const abortHandler = () => {
    cleanup();
    request.signal.removeEventListener('abort', abortHandler);
  };

  request.signal.addEventListener('abort', abortHandler);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
