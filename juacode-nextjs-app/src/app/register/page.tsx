'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import styles from './register.module.css';
import JuaCodeLogo from '@/assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

// Define a type for errorType for better type safety
type ErrorType = 'form' | 'password' | 'confirmation' | 'api_rate_limit' | 'error-form' | 'timeout' | 'api' | 'unexpected' | '' | null;

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [errorType, setErrorType] = useState<ErrorType>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    setPasswordValidation({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  }, [password]);

  const passwordsMatch = password === confirmPassword && confirmPassword !== '';

  const performRegistrationAttempt = async (attemptNumber: number, signal: AbortSignal) => {
    const res = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
      signal: signal,
      // Note: timeout on fetch is not a standard option, signal is used for aborting
    });
    return res;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setErrorType('');
    
    if (!name || !email || !password || !confirmPassword) {
      setMessage('Please fill in all fields.');
      setErrorType('form');
      return;
    }

    const allRequirementsMet = Object.values(passwordValidation).every(value => value);
    if (!allRequirementsMet) {
      setMessage('Please make sure your password meets all requirements.');
      setErrorType('password');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      setErrorType('error-form');
      return;
    }

    setIsSubmitting(true);
    setMessage("Registration in progress... This may take some time, please wait.");
    setErrorType(null);

    const controller = new AbortController();
    const overallTimeoutId = setTimeout(() => {
        controller.abort(); // Abort the ongoing fetch if any
        setIsSubmitting(false);
        setMessage("Registration timed out. The server might be busy. Please try again later.");
        setErrorType('timeout');
    }, 60000); // 60 seconds overall timeout

    let success = false;
    let retries = 0;
    const maxRetries = 3;
    const baseDelay = 2000;

    while (retries <= maxRetries && !success) {
      try {
        const res = await performRegistrationAttempt(retries + 1, controller.signal);
        const responseBody = await res.json(); // Parse JSON early to use in conditions

        if (!res.ok) {
            if (res.status === 429 && responseBody.code === 'supabase_rate_limited') {
                setMessage(responseBody.error || 'Too many registration attempts. Please wait a minute and try again.');
                setErrorType('api_rate_limit');
                success = false; // Explicitly ensure we don't proceed
                break; // Exit retry loop for this specific error
            } else if (res.status === 409) {
                setMessage(responseBody.error || 'This email is already registered. Please log in or use a different email.');
                setErrorType('error-form');
                success = false;
                break; 
            } else if (res.status === 504 || (res.status === 429 && retries < maxRetries)) {
                retries++;
                setMessage(`Server temporarily unavailable or rate limit hit (attempt ${retries}/${maxRetries+1}). Retrying in a few seconds...`);
                const delay = (res.status === 429 ? 5000 : baseDelay) * retries;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            } else {
                setMessage(responseBody.error || `Registration failed: ${res.statusText}`);
                setErrorType('api');
                success = false;
                break;
            }
        }

        // If res.ok is true
        setRegisteredEmail(email);
        setIsRegistered(true);
        success = true; // Mark as success to exit loop
        break; // Exit retry loop

      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          // This will be handled by the overallTimeoutId's message or if aborted earlier
          if (!success) { // Only set message if not already successful
             setMessage('Registration request was cancelled or timed out.');
             setErrorType('timeout');
          }
          success = false; // Ensure loop terminates if aborted by timeout
          break; 
        } 
        // Handle other fetch errors (network issues, etc.)
        if (retries < maxRetries) {
          retries++;
          setMessage(`Network error (attempt ${retries}/${maxRetries+1}). Retrying in a few seconds...`);
          await new Promise(resolve => setTimeout(resolve, baseDelay * retries));
          continue;
        } else {
          setMessage('Failed to complete registration due to network issues after several attempts.');
          setErrorType('api');
          success = false;
          break;
        }
      }
    }

    clearTimeout(overallTimeoutId);
    setIsSubmitting(false); // Ensure submit state is reset unless successful and redirecting
    if (success) {
      // setIsRegistered(true) is already called
    } else if (!message) { // If loop finished without success and no specific message set
        setMessage('Registration failed. Please try again.');
        setErrorType('unexpected');
    }
  };

  const renderValidationItem = (condition: boolean, text: string) => (
    <div className={`${styles.passwordValidationItem} ${condition ? styles.valid : styles.invalid}`}>
      <FontAwesomeIcon icon={condition ? faCheck : faTimes} className={styles.validationIcon} />
      <span>{text}</span>
    </div>
  );

  if (isRegistered) {
    return (
      <div className={styles.authPageContainer}>
        <button onClick={toggleTheme} className={styles.pageThemeToggle} title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: '1px solid var(--color-border-chat-container)', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '1em', padding: '0.5rem', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
        </button>
        <div className={`${styles.confirmationContainer} ${styles.authFormContainer}`}> {/* Combine for consistent styling */} 
          <div className={styles.robotIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="8" y="2" width="8" height="5" rx="1" />
              <path d="M18 8v10a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8m11 0H7a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1z" />
              <circle cx="10" cy="14" r="1" />
              <circle cx="14" cy="14" r="1" />
            </svg>
          </div>
          <h2>Confirm Your Email</h2>
          <p className={styles.confirmationMessage}>
            We&apos;ve sent a confirmation link to <span className={styles.emailHighlight}>{registeredEmail}</span>.
            <br />Please check your inbox and click the link to activate your account.
          </p>
          <p className={styles.confirmationNote}>If you don&apos;t see the email, please check your spam folder.</p>
          <button onClick={() => router.push('/login')} className={styles.authButton}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authPageContainer}>
       <button onClick={toggleTheme} className={styles.pageThemeToggle} title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: '1px solid var(--color-border-chat-container)', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '1em', padding: '0.5rem', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
      </button>
      <div className={styles.authFormContainer}>
        <Image 
          src={JuaCodeLogo}
          alt="JuaCode Logo" 
          className={styles.authLogoOutside}
          onClick={() => router.push('/')} // Navigate to landing page
          priority
        />
        <h2>Register</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="register-name">Name:</label>
            <input 
              id="register-name"
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
              className={errorType === 'form' ? styles.inputError : ''}
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="register-email">Email:</label>
            <input 
              id="register-email"
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className={errorType === 'form' ? styles.inputError : ''}
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="register-password">Password:</label>
            <input 
              id="register-password"
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className={errorType === 'password' ? styles.inputError : ''}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="register-confirm-password">Confirm Password:</label>
            <input 
              id="register-confirm-password"
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
              className={errorType === 'confirmation' ? styles.inputError : ''}
              autoComplete="new-password"
            />
            {confirmPassword && (
              <div className={styles.passwordMatchIndicator}>
                {passwordsMatch ? (
                  <span className={styles.passwordsMatch}>
                    <FontAwesomeIcon icon={faCheck} /> Passwords match
                  </span>
                ) : (
                  <span className={styles.passwordsDontMatch}>
                    <FontAwesomeIcon icon={faTimes} /> Passwords don&apos;t match
                  </span>
                )}
              </div>
            )}
          </div>

          <div className={styles.passwordRequirements}>
            <h4>Password Requirements:</h4>
            <div className={styles.passwordValidationList}>
              {renderValidationItem(passwordValidation.length, 'At least 8 characters')}
              {renderValidationItem(passwordValidation.uppercase, 'At least one uppercase letter')}
              {renderValidationItem(passwordValidation.lowercase, 'At least one lowercase letter')}
              {renderValidationItem(passwordValidation.number, 'At least one number')}
              {renderValidationItem(passwordValidation.special, 'At least one special character (e.g. !@#$)')}
            </div>
          </div>

          <button 
            type="submit" 
            className={styles.authButton} 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>
        </form>
        {message && <p className={`${styles.authMessage} ${styles[errorType || '']}`}>{message}</p>}
        <p className={styles.authNavigationLink}>
          Already have an account?{" "}
          <button onClick={() => router.push('/login')} className={styles.linkButton}>
            Login here
          </button>
        </p>
      </div>
    </div>
  );
} 