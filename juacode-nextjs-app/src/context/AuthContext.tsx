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
  is_admin: boolean;
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
          console.log('[AuthContext] User authenticated from localStorage:', parsedUserData);
        } catch (e) {
          console.error('[AuthContext] Error parsing stored user data, logging out:', e);
          clearAuthData(); // Clear inconsistent data
        }
      } else {
        console.log('[AuthContext] No complete stored auth data found.');
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
    console.log('[AuthContext] User logged in:', user);
    // router.push('/chat'); // Or wherever you want to redirect after login
  };

  const logout = () => {
    clearAuthData();
    console.log('[AuthContext] User logged out');
    router.push('/login'); // Redirect to login page after logout
  };

  // fetchUserData
  const fetchUserDataImpl = useCallback(async () => {
    if (!accessToken) {
      console.log("[AuthContext] fetchUserData called, but no access token found. Clearing auth data.");
      clearAuthData(); // Ensure logged out state if no token
      return;
    }

    console.log("[AuthContext] fetchUserData called. Attempting to fetch user data from /api/users/me");
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
        console.log("[AuthContext] User data fetched and updated:", fetchedUser);
      } else if (response.status === 401) {
        console.warn("[AuthContext] Unauthorized (401) fetching user data. Token might be invalid or expired. Clearing auth data.");
        clearAuthData();
        router.push('/login'); // Redirect to login
      } else {
        console.error(`[AuthContext] Failed to fetch user data. Status: ${response.status}. Clearing auth data.`);
        clearAuthData();
        // Optionally, redirect to login or show an error, depending on desired UX
      }
    } catch (error) {
      console.error("[AuthContext] Error during fetchUserData:", error);
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