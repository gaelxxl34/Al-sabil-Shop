"use client";

import React, { ReactNode } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { NotificationProvider } from '@/contexts/NotificationContext';

interface NotificationWrapperProps {
  children: ReactNode;
}

export const NotificationWrapper: React.FC<NotificationWrapperProps> = ({ children }) => {
  const { user, userData } = useAuth();

  return (
    <NotificationProvider 
      userId={user?.uid} 
      userRole={userData?.role as 'customer' | 'seller' | 'admin'}
    >
      {children}
    </NotificationProvider>
  );
};
