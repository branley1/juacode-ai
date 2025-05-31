"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // For navigation after login/logout

// Define the shape of your user data
interface User {
  id: string;
  email: string;
  username?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  isUserAuthenticated: boolean;
  userData: User | null;
  accessToken: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  checkAuthOnMount: () => void;
  fetchUserData?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isUserAuthenticated, setIsUserAuthenticated] = useState<boolean>(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const router = useRouter();

  const checkAuthOnMount = useCallback(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('access_token');
      const storedUserData = localStorage.getItem('userData');
      const storedAuth = localStorage.getItem('isAuthenticated');

      if (storedToken && storedUserData && storedAuth === 'true') {
        try {
          const parsedUserData: User = JSON.parse(storedUserData);
          setUserData(parsedUserData);
          setAccessToken(storedToken);
          setIsUserAuthenticated(true);
        } catch (e) {
          clearAuthData(); // Clear inconsistent data
        }
      } else {
        clearAuthData(); // Ensure a clean state if data is partial/missing
      }
    }
  }, []);

  useEffect(() => {
    checkAuthOnMount();
  }, [checkAuthOnMount]);

  const clearAuthData = () => {
    setIsUserAuthenticated(false);
    setUserData(null);
    setAccessToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userData');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('access_token');
    }
  };

  const login = (user: User, token: string) => {
    setIsUserAuthenticated(true);
    setUserData(user);
    setAccessToken(token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('userData', JSON.stringify(user));
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('access_token', token);
    }
    // router.push('/chat'); // Or wherever you want to redirect after login
  };

  const logout = () => {
    clearAuthData();
    router.push('/login'); // Redirect to login page after logout
  };

  // fetchUserData
  const fetchUserDataImpl = useCallback(async () => {
    if (!accessToken) {
      clearAuthData(); // Ensure logged out state if no token
      return;
    }

    try {
      const response = await fetch('/api/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const fetchedUser: User = await response.json();
        setUserData(fetchedUser);
        setIsUserAuthenticated(true); // Ensure this is true
        // Update localStorage as well
        localStorage.setItem('userData', JSON.stringify(fetchedUser));
        localStorage.setItem('isAuthenticated', 'true');
      } else if (response.status === 401) {
        clearAuthData();
        router.push('/login'); // Redirect to login
      } else {
        clearAuthData();
        // Optionally, redirect to login or show an error, depending on desired UX
      }
    } catch (error) {
      clearAuthData();
      // Optionally, redirect or show error
    }
  }, [accessToken, router]);

  return (
    <AuthContext.Provider value={{ isUserAuthenticated, userData, accessToken, login, logout, checkAuthOnMount, fetchUserData: fetchUserDataImpl }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 