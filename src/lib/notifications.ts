// src/lib/notifications.ts
type NotificationData = {
  id?: string;
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
  timestamp?: string;
};

type Connection = {
  controller: ReadableStreamDefaultController;
  userId: string;
  userRole: string;
};

class NotificationManager {
  private connections: Map<string, Connection> = new Map();

  addConnection(connectionId: string, connection: Connection) {
    this.connections.set(connectionId, connection);
    console.log(`SSE: Client connected - ${connectionId} (${connection.userRole})`);
  }

  removeConnection(connectionId: string) {
    this.connections.delete(connectionId);
    console.log(`SSE: Client disconnected - ${connectionId}`);
  }

  getConnections() {
    return this.connections;
  }

  // Helper function to broadcast notifications to specific users
  broadcastNotification(notification: NotificationData) {
    const data = JSON.stringify({
      ...notification,
      timestamp: notification.timestamp || new Date().toISOString(),
    });

    let sentCount = 0;

    this.connections.forEach((connection, connectionId) => {
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
        this.connections.delete(connectionId);
      }
    });

    console.log(`SSE: Notification sent to ${sentCount} connections:`, notification.type);
  }

  // Broadcast to all users of a specific role
  broadcastToRole(role: 'seller' | 'customer', notification: Omit<NotificationData, 'targetRole'>) {
    this.broadcastNotification({
      ...notification,
      targetRole: role
    });
  }

  // Broadcast to a specific user
  broadcastToUser(userId: string, notification: Omit<NotificationData, 'targetUserId'>) {
    this.broadcastNotification({
      ...notification,
      targetUserId: userId
    });
  }
}

// Export a singleton instance
export const notificationManager = new NotificationManager();

export { type NotificationData };
