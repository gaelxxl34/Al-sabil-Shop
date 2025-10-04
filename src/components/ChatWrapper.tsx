"use client";

import { useAuth } from "@/components/AuthProvider";
import FloatingChatButton from "@/components/FloatingChatButton";
import NotificationBell from "@/components/NotificationBell";

/**
 * ChatWrapper component renders chat and notification components
 * only when user is authenticated
 */
export default function ChatWrapper() {
  const { user, userData, loading } = useAuth();

  // Don't render anything while loading or if not authenticated
  if (loading || !user) {
    return null;
  }

  return (
    <>
      {/* Floating chat button - bottom right */}
      <FloatingChatButton userId={user.uid} userRole={userData?.role} />
      
      {/* Notification bell - render in portal or fixed position */}
      <div className="fixed top-4 right-4 z-40">
        <NotificationBell />
      </div>
    </>
  );
}
