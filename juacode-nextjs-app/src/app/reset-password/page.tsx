'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import styles from '../register/register.module.css'; // Reusing register styles for password validation
import JuaCodeLogo from '@/assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'error', 'success', 'warning'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState<string | undefined>(undefined);
  const [email, setEmail] = useState('');
  
  const router = useRouter();
  const { isUserAuthenticated } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    // Get access, refresh tokens from URL search or hash
    const { search, hash } = window.location;
    const searchParams = new URLSearchParams(search);
    const fragmentParams = new URLSearchParams(hash.substring(1));

    // Email via query param
    const emailFromQuery = searchParams.get('email');
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }

    // Access & refresh tokens from fragment or query
    const accessTokenFromHash = fragmentParams.get('access_token');
    const refreshTokenFromHash = fragmentParams.get('refresh_token');
    const accessTokenFromSearch = searchParams.get('access_token');
    const refreshTokenFromSearch = searchParams.get('refresh_token');

    const token = accessTokenFromHash || accessTokenFromSearch;
    const refresh = refreshTokenFromHash || refreshTokenFromSearch;

    if (token) {
      setAccessToken(token);
      setRefreshToken(refresh || undefined);
    } else {
      setMessage('Password reset token not found in URL. Please use the link from your email.');
      setMessageType('error');
      setAccessToken('');
      setRefreshToken(undefined);
    }
  }, []); // useEffect runs once on mount

  // Password validation
  const passwordValidation = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');
    setIsSubmitting(true);

    if (!password || !confirmPassword) {
      setMessage('Please fill in all fields.');
      setMessageType('error');
      setIsSubmitting(false);
      return;
    }

    if (!isPasswordValid) {
      setMessage('Please ensure your password meets all requirements.');
      setMessageType('error');
      setIsSubmitting(false);
      return;
    }

    if (!passwordsMatch) {
      setMessage('Passwords do not match.');
      setMessageType('error');
      setIsSubmitting(false);
      return;
    }

    if (!accessToken) {
      setMessage('Invalid reset token. Please request a new password reset.');
      setMessageType('error');
      setIsSubmitting(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          password, 
          access_token: accessToken,
          refresh_token: refreshToken
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || 'Failed to reset password. Please try again.');
        setMessageType('error');
        setIsSubmitting(false);
        return;
      }
      
      // Success
      setMessage(result.message || 'Password reset successfully! You can now log in with your new password.');
      setMessageType('success');
      setIsSubmitting(false);
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        setMessage('Request timed out. Please try again later.');
        setMessageType('error');
      } else {
        setMessage('Failed to reset password due to a network error. Please try again later.');
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

      <Image 
        src={JuaCodeLogo}
        alt="JuaCode Logo" 
        className={styles.authLogoOutside}
        onClick={() => router.push('/')}
        priority
      />
      
      <div className={styles.authFormContainer}>
        <h2>Set New Password</h2>
        {email && (
          <p style={{
            textAlign: 'center',
            marginBottom: '1rem',
            color: 'var(--color-text-secondary)',
            fontSize: '0.95rem'
          }}>
            Resetting password for <strong>{email}</strong>
          </p>
        )}
        <p style={{ 
          textAlign: 'center', 
          marginBottom: '1.5rem', 
          color: 'var(--color-text-secondary)', 
          fontSize: '0.95rem',
          lineHeight: '1.5'
        }}>
          Enter your new password below.
        </p>
        
        <form onSubmit={handleSubmit}>
          {/* For accessibility and password managers, include the username (email) */}
          {email && <input type="hidden" autoComplete="username" id="username" name="username" value={email} readOnly />}
          <div>
            <label htmlFor="new-password">New Password:</label>
            <input 
              id="new-password"
              type="password" 
              name="new-password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              autoComplete="new-password"
              placeholder="Enter your new password"
              className={!isPasswordValid && password ? styles.inputError : ''}
            />
          </div>

          {/* Password Requirements */}
          {password && (
            <div className={styles.passwordRequirements}>
              <h3>Password Requirements:</h3>
              <div className={styles.passwordValidationList}>
                <div className={`${styles.passwordValidationItem} ${passwordValidation.minLength ? styles.valid : styles.invalid}`}>
                  <FontAwesomeIcon 
                    icon={passwordValidation.minLength ? faCheck : faTimes} 
                    className={styles.validationIcon} 
                  />
                  At least 8 characters
                </div>
                <div className={`${styles.passwordValidationItem} ${passwordValidation.hasUppercase ? styles.valid : styles.invalid}`}>
                  <FontAwesomeIcon 
                    icon={passwordValidation.hasUppercase ? faCheck : faTimes} 
                    className={styles.validationIcon} 
                  />
                  One uppercase letter
                </div>
                <div className={`${styles.passwordValidationItem} ${passwordValidation.hasLowercase ? styles.valid : styles.invalid}`}>
                  <FontAwesomeIcon 
                    icon={passwordValidation.hasLowercase ? faCheck : faTimes} 
                    className={styles.validationIcon} 
                  />
                  One lowercase letter
                </div>
                <div className={`${styles.passwordValidationItem} ${passwordValidation.hasNumber ? styles.valid : styles.invalid}`}>
                  <FontAwesomeIcon 
                    icon={passwordValidation.hasNumber ? faCheck : faTimes} 
                    className={styles.validationIcon} 
                  />
                  One number
                </div>
                <div className={`${styles.passwordValidationItem} ${passwordValidation.hasSpecialChar ? styles.valid : styles.invalid}`}>
                  <FontAwesomeIcon 
                    icon={passwordValidation.hasSpecialChar ? faCheck : faTimes} 
                    className={styles.validationIcon} 
                  />
                  One special character
                </div>
              </div>
            </div>
          )}
          
          <div>
            <label htmlFor="confirm-password">Confirm New Password:</label>
            <input 
              id="confirm-password"
              type="password" 
              name="confirm-password"
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
              autoComplete="new-password"
              placeholder="Confirm your new password"
              className={confirmPassword && !passwordsMatch ? styles.inputError : ''}
            />
          </div>

          {/* Password Match Indicator */}
          {confirmPassword && (
            <div className={styles.passwordMatchIndicator}>
              {passwordsMatch ? (
                <span className={styles.passwordsMatch}>✓ Passwords match</span>
              ) : (
                <span className={styles.passwordsDontMatch}>✗ Passwords do not match</span>
              )}
            </div>
          )}
          
          <button 
            type="submit" 
            className={styles.authButton}
            disabled={isSubmitting || !isPasswordValid || !passwordsMatch || !accessToken}
          >
            {isSubmitting ? 'Updating...' : 'Update Password'}
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