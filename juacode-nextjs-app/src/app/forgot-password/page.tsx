'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import styles from '../login/login.module.css'; // Reusing login styles
import JuaCodeLogo from '@/assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'error', 'success', 'warning'
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();
  const { isUserAuthenticated } = useAuth();
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

    if (!email) {
      setMessage('Please enter your email address.');
      setMessageType('error');
      setIsSubmitting(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

    try {
      const response = await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || 'Failed to send reset email. Please try again.');
        setMessageType('error');
        setIsSubmitting(false);
        return;
      }
      
      // Success
      setMessage(result.message || 'Password reset email sent! Please check your inbox.');
      setMessageType('success');
      setIsSubmitting(false);
      
      // Clear the email field after successful submission
      setEmail('');

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        setMessage('Request timed out. Please try again later.');
        setMessageType('error');
      } else {
        console.error('Forgot password fetch error:', fetchError);
        setMessage('Failed to send reset email due to a network error. Please try again later.');
        setMessageType('error');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.authPageContainer}>
      <button 
        onClick={toggleTheme} 
        className="pageThemeToggle"
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        style={{ 
          position: 'absolute', 
          top: '1.5rem', 
          right: '1.5rem', 
          background: 'none', 
          border: '1px solid var(--color-border-chat-container)', 
          color: 'var(--color-text-primary)', 
          cursor: 'pointer', 
          fontSize: '1em', 
          padding: '0.5rem', 
          borderRadius: '50%', 
          width: '40px', 
          height: '40px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center'
        }}
      >
        <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
      </button>
      
      <button 
        onClick={() => router.push('/login')} 
        className="backButton"
        title="Back to Login"
        style={{ 
          position: 'absolute', 
          top: '1.5rem', 
          left: '1.5rem', 
          background: 'none', 
          border: '1px solid var(--color-border-chat-container)', 
          color: 'var(--color-text-primary)', 
          cursor: 'pointer', 
          fontSize: '1em', 
          padding: '0.5rem', 
          borderRadius: '50%', 
          width: '40px', 
          height: '40px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center'
        }}
      >
        <FontAwesomeIcon icon={faArrowLeft} />
      </button>

      <Image 
        src={JuaCodeLogo}
        alt="JuaCode Logo" 
        className={styles.authLogoOutside}
        onClick={() => router.push('/')}
        priority
      />
      
      <div className={styles.authFormContainer}>
        <h2>Reset Password</h2>
        <p style={{ 
          textAlign: 'center', 
          marginBottom: '1.5rem', 
          color: 'var(--color-text-secondary)', 
          fontSize: '0.95rem',
          lineHeight: '1.5'
        }}>
          Enter your email address and we'll send you a link to reset your password.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="forgot-email">Email:</label>
            <input 
              id="forgot-email"
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              autoComplete="email"
              placeholder="Enter your email address"
            />
          </div>
          
          <button 
            type="submit" 
            className={styles.authButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        
        {message && (
          <p className={`${styles.authMessage} ${styles[messageType]}`}>
            {message}
          </p>
        )}
        
        <p className={styles.authNavigationLink}>
          Remember your password?{" "}
          <button onClick={() => router.push('/login')} className={styles.linkButton}>
            Back to Login
          </button>
        </p>
      </div>
    </div>
  );
} 