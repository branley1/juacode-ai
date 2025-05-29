'use client';

import React, { useEffect } from 'react';
import ChatInterface from '@/components/ChatInterface/ChatInterface';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const { isUserAuthenticated, userData, logout } = useAuth();
  const router = useRouter();

  const chatInterfaceProps = {
    onNavigateToLogin: () => router.push('/login'),
    isUserAuthenticated: isUserAuthenticated,
    userData: userData,
    onNavigateToProfile: () => router.push('/profile'),
    onLogout: () => {
      logout();
      router.push('/login');
    },
  };

  useEffect(() => {
    if (!isUserAuthenticated) {
      router.push('/login');
    }
  }, [isUserAuthenticated, router]);

  if (!isUserAuthenticated) {
    return null; 
  }

  return <ChatInterface {...chatInterfaceProps} />;
} 