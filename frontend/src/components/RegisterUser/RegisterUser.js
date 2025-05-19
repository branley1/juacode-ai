import React, { useState, useEffect } from 'react';
import './RegisterUser.css';
import JuaCodeLogo from '../../assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../../supabaseClient';

function RegisterUser({ onRegistrationSuccess, onNavigateToLogin, isDarkMode, toggleTheme, setCurrentView }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [errorType, setErrorType] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrorType('');
    
    // Validate all fields are filled
    if (!username || !email || !password || !confirmPassword) {
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
      setErrorType('confirmation');
      return;
    }

    setIsSubmitting(true);

    try {
      // Supabase sign up with timeout handling
      const supabasePromise = supabase.auth.signUp({
        email,
        password,
        options: { data: { username } }
      });
      
      // Set a timeout for the Supabase request
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase request timed out')), 15000)
      );
      
      // Race between the actual request and the timeout
      const { data, error } = await Promise.race([supabasePromise, timeoutPromise]);

      if (error) {
        setMessage(formatErrorMessage(error.message) || 'Registration failed.');
        setErrorType('supabase');
        setIsSubmitting(false);
        return;
      }

      if (!data.user) {
        setMessage('Registration failed: No user returned.');
        setErrorType('supabase');
        setIsSubmitting(false);
        return;
      }

      // Store the email for the confirmation screen
      setRegisteredEmail(email);

      // Call backend to create user profile with timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const res = await fetch('/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (!res.ok) {
          // If response exists but is not ok (e.g. 504, 500, etc.)
          let errorData = { error: 'Server error' };
          try {
            errorData = await res.json();
          } catch (e) {
            // If the response can't be parsed as JSON, use status text
            errorData = { error: `Server error: ${res.status} ${res.statusText}` };
          }
          
          setMessage(formatErrorMessage(errorData.error) || 'Failed to save user profile.');
          setErrorType(res.status === 504 ? 'timeout' : 'api');
          setIsSubmitting(false);
          return;
        }
        
        const result = await res.json();

        if (!res.ok) {
          setMessage(formatErrorMessage(result.error) || 'Failed to save user profile.');
          setErrorType(result.code || 'api');
          setIsSubmitting(false);
          return;
        }

        setShowConfirmation(true);
        setMessage('');
        setIsSubmitting(false);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          setMessage('Registration request timed out. The server is taking too long to respond. Please try again later or contact support if the problem persists.');
          setErrorType('timeout');
        } else {
          setMessage('Failed to complete registration. Please try again later. If the problem persists, please contact support.');
          setErrorType('api');
        }
        setIsSubmitting(false);
      }
    } catch (err) {
      if (err.message === 'Supabase request timed out') {
        setMessage('Authentication service timed out. Please try again later when the service is more responsive.');
        setErrorType('timeout');
      } else {
        setMessage('An unexpected error occurred. Please try again later.');
        setErrorType('unexpected');
      }
      setIsSubmitting(false);
    }
  };

  // Helper function to format error messages to be more user-friendly
  const formatErrorMessage = (error) => {
    if (!error) return null;
    
    // Make error messages more user-friendly
    if (error.includes('already registered')) {
      return 'This email is already registered. Please use a different email or try logging in.';
    }
    if (error.includes('Username already taken')) {
      return 'This username is already taken. Please choose a different username.';
    }
    if (error.includes('email address is invalid')) {
      return 'The email address you entered appears to be invalid. Please check and try again.';
    }
    if (error.includes('password')) {
      return 'Please ensure your password meets the requirements.';
    }
    if (error.includes('timeout') || error.includes('timed out')) {
      return 'The server took too long to respond. Please try again later when network conditions improve.';
    }
    if (error.includes('504') || error.includes('Gateway Timeout')) {
      return 'The server is temporarily unavailable or overloaded. Please try again in a few minutes.';
    }

    return error; // Return original error if no specific formatting is needed
  };

  // Function to render a validation item
  const renderValidationItem = (condition, text) => (
    <div className={`password-validation-item ${condition ? 'valid' : 'invalid'}`}>
      <FontAwesomeIcon icon={condition ? faCheck : faTimes} className="validation-icon" />
      <span>{text}</span>
    </div>
  );

  if (showConfirmation) {
    return (
      <div className="auth-page-container register-user-container">
        <div className="auth-form-container confirmation-container" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <h2 style={{ color: 'var(--color-text-primary)' }}>Confirm Your Email</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', margin: '1.5rem 0' }}>
            We've sent a confirmation link to <b>{registeredEmail}</b>.<br />
            Please check your inbox and click the link to activate your account.
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            If you don't see the email, please check your spam folder.
          </p>
          <button className="auth-button" onClick={onNavigateToLogin} style={{ marginTop: '1.5rem' }}>
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
      <img 
        src={JuaCodeLogo} 
        alt="JuaCode Logo" 
        className="auth-logo-outside"
        onClick={() => setCurrentView('landing')} 
      />
      <div className="auth-form-container">
        <h2>Register</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="register-username">Username:</label>
            <input 
              id="register-username"
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              className={errorType === 'username' ? 'input-error' : ''}
              autoComplete="username"
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
        {message && <p className={`auth-message error-${errorType}`}>{message}</p>}
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