import React, { useState } from 'react';
import './RegisterUser.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';

function RegisterUser({ onRegistrationSuccess, onNavigateToLogin, isDarkMode, toggleTheme }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (username && email && password) {
        setMessage('Registration successful (mocked)');
        if (onRegistrationSuccess) {
            onRegistrationSuccess();
        }
    } else {
        setMessage('Please fill in all fields.');
    }
  };

  return (
    <div className="auth-page-container register-user-container">
      <button onClick={toggleTheme} className="theme-toggle-button page-theme-toggle" title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
        <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
      </button>
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
            />
          </div>
          <button type="submit" className="auth-button">Register</button>
        </form>
        {message && <p className="auth-message">{message}</p>}
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