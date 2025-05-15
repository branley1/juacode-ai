import React, { useState } from 'react';
import './Login.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';

function Login({ onLoginSuccess, onNavigateToRegister, isDarkMode, toggleTheme }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (email && password) {
        setMessage('Login successful (mocked)');
        if (onLoginSuccess) {
            onLoginSuccess();
        }
    } else {
        setMessage('Please enter email and password.');
    }
  };

  return (
    <div className="auth-page-container login-container">
      <button onClick={toggleTheme} className="theme-toggle-button page-theme-toggle" title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
        <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
      </button>
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
            />
          </div>
          <button type="submit" className="auth-button">Login</button>
        </form>
        {message && <p className="auth-message">{message}</p>}
        <p className="auth-navigation-link">
          Don't have an account?{" "}
          <button onClick={onNavigateToRegister} className="link-button">
            Register here
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login; 