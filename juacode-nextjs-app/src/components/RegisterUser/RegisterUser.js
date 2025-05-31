import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import './RegisterUser.css';
import JuaCodeLogo from '../../assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

function RegisterUser({ onNavigateToLogin, isDarkMode, toggleTheme, setCurrentView }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [errorType, setErrorType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  // Password validation states
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  // Effect for password validation
  useEffect(() => {
    setPasswordValidation({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  }, [password]);

  // Check if passwords match
  const passwordsMatch = password === confirmPassword && confirmPassword !== '';

  // Helper function for the fetch call
  const performRegistrationAttempt = async (attemptNumber, signal) => {
    const res = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
      signal: signal,
      timeout: 30000 // 30 second timeout for the fetch
    });
    return res;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrorType('');
    
    // Validate all fields are filled
    if (!name || !email || !password || !confirmPassword) {
      setMessage('Please fill in all fields.');
      setErrorType('form');
      return;
    }

    // Validate password meets requirements
    const allRequirementsMet = Object.values(passwordValidation).every(value => value);
    if (!allRequirementsMet) {
      setMessage('Please make sure your password meets all requirements.');
      setErrorType('password');
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      setErrorType('error-form');
      return;
    }

    // Show loading state
    setIsSubmitting(true);
    setMessage("Registration in progress... This may take up to 30 seconds, please wait.");
    setErrorType(null); // No error type as this is an informational message

    // Set up a longer timeout for the entire registration process
    const timeoutId = setTimeout(() => {
      setIsSubmitting(false);
      setMessage("Registration timed out. Supabase may be experiencing high traffic. Please try again later.");
      setErrorType('error-timeout');
    }, 60000); // 60 seconds timeout

    let success = false;
    let retries = 0;
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds base delay between retries

    const controller = new AbortController();
    
    while (retries <= maxRetries && !success) {
      try {
        // Call the helper function
        const res = await performRegistrationAttempt(retries + 1, controller.signal);

        if (res.status === 504 || res.status === 429) {
          retries++;
          if (retries <= maxRetries) {
            let waitTime = 3000;
            if (res.status === 429) {
              waitTime = 5000;
              setMessage('Rate limit hit. Waiting longer before retrying...');
            }
            const currentRetryCount = retries;
            await new Promise(resolve => setTimeout(resolve, waitTime * currentRetryCount));
            continue;
          }
        }
        
        if (!res.ok) {
          // If response exists but is not ok
          let errorData = { error: 'Server error' };
          try {
            errorData = await res.json();
          } catch (parseError) {
            // If we can't parse the JSON, use status text
            errorData = { 
              error: `Server error: ${res.status} ${res.statusText || 'No response'}`,
              isNetworkError: true
            };
          }

          // Check for specific Supabase rate limit error passed from our backend
          if (res.status === 429 && errorData.code === 'supabase_rate_limited') {
            setMessage(errorData.error || 'Too many registration attempts. Please wait a minute and try again.');
            setErrorType('api_rate_limit'); // Use a more specific error type
            setIsSubmitting(false);
            clearTimeout(timeoutId); // Clear the main timeout for the whole registration attempt
            return; // Stop retrying from the client side for this specific error
          }
          
          if (res.status === 409) {
            // Email already exists case
            setMessage(errorData.error || 'This email is already registered. Please log in or use a different email.');
            setErrorType('error-form');
            setIsSubmitting(false);
            clearTimeout(timeoutId);
            return; // No need to retry for this specific error
          }

          if (res.status >= 500 || errorData.isNetworkError) {
            // Server error, try again
            retries++;
            // Exponential backoff: wait longer between each retry
            const delay = Math.min(baseDelay * Math.pow(2, retries), 10000); // Cap at 10 seconds
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Try again
          }

          // For other errors, show the message and stop
          setMessage(errorData.error || 'Registration failed, please try again');
          setErrorType('error-form');
          setIsSubmitting(false);
          clearTimeout(timeoutId);
          return;
        }
        
        // Registration successful - handle success case
        try {
          const userData = await res.json();
          
          // Set the email for confirmation screen
          setRegisteredEmail(email);
          
          // Update UI to show success and confirmation message
          setIsRegistered(true);
          setIsSubmitting(false);
          clearTimeout(timeoutId);
          success = true;
          break;
        } catch (parseError) {
          // Still consider it a success if we got a 2xx response
          setRegisteredEmail(email);
          setIsRegistered(true);
          setIsSubmitting(false);
          clearTimeout(timeoutId);
          success = true;
          break;
        }
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          setMessage('Registration request timed out. The server is taking too long to respond. Please try again later or contact support if the problem persists.');
          setErrorType('timeout');
          setIsSubmitting(false);
          clearTimeout(timeoutId);
          return;
        } else if (retries < maxRetries) {
          retries++;
          // Wait before retrying
          const currentRetryCount = retries;
          await new Promise(resolve => setTimeout(resolve, baseDelay * currentRetryCount));
        } else {
          setMessage('Failed to complete registration after several attempts. Please try again later. If the problem persists, please contact support.');
          setErrorType('api');
          setIsSubmitting(false);
          clearTimeout(timeoutId);
          return;
        }
      }
    }
    
    clearTimeout(timeoutId);
    
  };

  // Function to render a validation item
  const renderValidationItem = (condition, text) => (
    <div className={`password-validation-item ${condition ? 'valid' : 'invalid'}`}>
      <FontAwesomeIcon icon={condition ? faCheck : faTimes} className="validation-icon" />
      <span>{text.replace(/'/g, "&apos;")}</span>
    </div>
  );

  if (isRegistered) {
    return (
      <div className="auth-page-container register-user-container">
        <button onClick={toggleTheme} className="page-theme-toggle" title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
          <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
        </button>
        <div className="confirmation-container">
          <div className="robot-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="8" y="2" width="8" height="5" rx="1" />
              <path d="M18 8v10a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8m11 0H7a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1z" />
              <circle cx="10" cy="14" r="1" />
              <circle cx="14" cy="14" r="1" />
            </svg>
          </div>
          <h2>Confirm Your Email</h2>
          <p className="confirmation-message">
            We&apos;ve sent a confirmation link to <span className="email-highlight">{registeredEmail}</span>.
            <br />Please check your inbox and click the link to activate your account.
          </p>
          <p className="confirmation-note">If you don&apos;t see the email, please check your spam folder.</p>
          <button onClick={onNavigateToLogin} className="auth-button">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-container register-user-container">
      <button onClick={toggleTheme} className="page-theme-toggle" title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
        <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
      </button>
      <Image 
        src={JuaCodeLogo} 
        alt="JuaCode Logo" 
        className="auth-logo-outside"
        onClick={() => setCurrentView('landing')}
        width={80}
        height={80}
      />
      <div className="auth-form-container">
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
              className={errorType === 'name' ? 'input-error' : ''}
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
              className={errorType === 'email' ? 'input-error' : ''}
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
              className={errorType === 'password' ? 'input-error' : ''}
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
              className={errorType === 'confirmation' ? 'input-error' : ''}
              autoComplete="new-password"
            />
            {confirmPassword && (
              <div className="password-match-indicator">
                {passwordsMatch ? (
                  <span className="passwords-match">
                    <FontAwesomeIcon icon={faCheck} /> Passwords match
                  </span>
                ) : (
                  <span className="passwords-dont-match">
                    <FontAwesomeIcon icon={faTimes} /> Passwords don't match
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="password-requirements">
            <h3>Password Requirements:</h3>
            <div className="password-validation-list">
              {renderValidationItem(passwordValidation.length, 'At least 8 characters')}
              {renderValidationItem(passwordValidation.uppercase, 'At least one uppercase letter')}
              {renderValidationItem(passwordValidation.lowercase, 'At least one lowercase letter')}
              {renderValidationItem(passwordValidation.number, 'At least one number')}
              {renderValidationItem(passwordValidation.special, 'At least one special character')}
            </div>
          </div>

          <button 
            type="submit" 
            className="auth-button" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>
        </form>
        {message && <p className={`auth-message ${errorType}`}>{message}</p>}
        <p className="auth-navigation-link">
          Already have an account?{" "}
          <button onClick={onNavigateToLogin} className="link-button">
            Login here
          </button>
        </p>
      </div>
    </div>
  );
}

export default RegisterUser; 