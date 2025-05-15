import React, { useState } from 'react';
import './RegisterUser.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../../supabaseClient';

function RegisterUser({ onRegistrationSuccess, onNavigateToLogin, isDarkMode, toggleTheme }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!username || !email || !password) {
      setMessage('Please fill in all fields.');
      return;
    }
    // Supabase sign up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
    if (error) {
      setMessage(error.message || 'Registration failed.');
      return;
    }
    if (!data.user) {
      setMessage('Registration failed: No user returned.');
      return;
    }
    // Call backend to create user profile
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const result = await res.json();
      if (!res.ok) {
        setMessage(result.error || 'Failed to save user profile.');
        return;
      }
      setShowConfirmation(true);
      setMessage('');
    } catch (err) {
      setMessage('Registration succeeded, but failed to save user profile.');
    }
  };

  if (showConfirmation) {
    return (
      <div className="auth-page-container register-user-container">
        <div className="auth-form-container" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <h2 style={{ color: 'var(--color-text-primary)' }}>Confirm Your Email</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', margin: '1.5rem 0' }}>
            We've sent a confirmation link to <b>{email}</b>.<br />
            Please check your inbox and click the link to activate your account.<br />
            (If you don't see it, check your spam folder.)
          </p>
          <button className="auth-button" onClick={onNavigateToLogin} style={{ marginTop: '2rem' }}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

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