import React, { useState } from 'react';
import Image from 'next/image';
import './Login.css';
import JuaCodeLogo from '../../assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';

function Login({ onLoginSuccess, onNavigateToRegister, isDarkMode, toggleTheme, setCurrentView }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'error' or 'success'
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');
    setIsSubmitting(true);

    try {
      if (!email || !password) {
        setMessage('Please enter both email and password.');
        setMessageType('error');
        setIsSubmitting(false);
        return;
      }

      // Create an AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

      try {
        const response = await fetch('/api/users/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorData = { error: 'Login failed' };
          try {
            errorData = await response.json();
            // @ts-ignore
          } catch (parseError) {
            // If the response can't be parsed as JSON, use status text
            errorData = { error: `Server error: ${response.status} ${response.statusText}` };
          }

          // Handle specific error codes
          if (response.status === 400 && errorData.code === 'email_not_confirmed') {
            setMessage('Please check your email and confirm your account before logging in.');
            setMessageType('warning');
          } else if (response.status === 401) {
            setMessage('Invalid email or password. Please try again.');
            setMessageType('error');
          } else if (response.status === 504) {
            setMessage('The server is temporarily unavailable. Please try again later.');
            setMessageType('timeout');
          } else {
            setMessage(errorData.error || 'Login failed. Please try again.');
            setMessageType('error');
          }
          setIsSubmitting(false);
          return;
        }

        const result = await response.json();
        
        setMessage('Login successful');
        setMessageType('success');
        setIsSubmitting(false);
        
        if (onLoginSuccess) {
          // Store the access token if available
          if (result.access_token) {
            localStorage.setItem('access_token', result.access_token);
          }
          onLoginSuccess(result.user, result.access_token);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          setMessage('Login request timed out. The server is taking too long to respond. Please try again later.');
          setMessageType('timeout');
        } else {
          setMessage('Login failed. Please try again later.');
          setMessageType('error');
        }
        setIsSubmitting(false);
      }
    } catch (submitError) {
      // @ts-ignore
      setMessage('An unexpected error occurred. Please try again.');
      setMessageType('error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container login-container">
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
            className="auth-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
        {message && <p className={`auth-message ${messageType}`}>{message}</p>}
        <p className="auth-navigation-link">
          Don&apos;t have an account?{" "}
          <button onClick={onNavigateToRegister} className="link-button">
            Register here
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login; 