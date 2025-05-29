'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import styles from './login.module.css';
import JuaCodeLogo from '@/assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'error', 'success', 'warning', 'timeout'
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();
  const { login, isUserAuthenticated } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    if (isUserAuthenticated) {
      router.push('/chat');
    }
  }, [isUserAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');
    setIsSubmitting(true);

    if (!email || !password) {
      setMessage('Please enter both email and password.');
      setMessageType('error');
      setIsSubmitting(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

    try {
      console.log('Sending login request to: /api/users/login');
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json(); // Try to parse JSON regardless of response.ok

      if (!response.ok) {
        if (response.status === 400 && result.code === 'email_not_confirmed') {
          setMessage('Please check your email and confirm your account before logging in.');
          setMessageType('warning');
        } else if (response.status === 401) {
          setMessage(result.error || 'Invalid email or password. Please try again.');
          setMessageType('error');
        } else if (response.status === 504) {
          setMessage('The server is temporarily unavailable. Please try again later.');
          setMessageType('timeout');
        } else {
          setMessage(result.error || `Login failed: ${response.statusText}`);
          setMessageType('error');
        }
        setIsSubmitting(false);
        return;
      }
      
      // Login successful
      setMessage('Login successful! Redirecting...');
      setMessageType('success');
      
      // Call context login function
      if (result.user && result.access_token) {
        login(result.user, result.access_token);
        // AuthContext's useEffect will redirect to /chat or fetch user data
      } else {
        // Should not happen if response.ok and API is consistent
        setMessage('Login successful, but user data or token was not received.');
        setMessageType('error');
      }
      // No need to setIsSubmitting(false) here if redirecting or relying on AuthContext effect

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        setMessage('Login request timed out. Please try again later.');
        setMessageType('timeout');
      } else {
        console.error('Login fetch error:', fetchError);
        setMessage('Login failed due to a network or server issue. Please try again later.');
        setMessageType('error');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.authPageContainer}>
       <button 
        onClick={toggleTheme} 
        className={`${styles.pageThemeToggle || 'pageThemeToggle'}`} // Fallback class name for safety
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: '1px solid var(--color-border-chat-container)', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '1em', padding: '0.5rem', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
      >
        <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
      </button>
      <Image 
        src={JuaCodeLogo}
        alt="JuaCode Logo" 
        className={styles.authLogoOutside}
        onClick={() => router.push('/')} // Navigate to landing page
        priority
      />
      <div className={styles.authFormContainer}>
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login-email">Email:</label>
            <input 
              id="login-email"
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="login-password">Password:</label>
            <input 
              id="login-password"
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              autoComplete="current-password"
            />
          </div>
          <button 
            type="submit" 
            className={styles.authButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
        {message && <p className={`${styles.authMessage} ${styles[messageType]}`}>{message}</p>}
        <p className={styles.authNavigationLink}>
          Don&apos;t have an account?{" "}
          <button onClick={() => router.push('/register')} className={styles.linkButton}>
            Register here
          </button>
        </p>
      </div>
    </div>
  );
} 