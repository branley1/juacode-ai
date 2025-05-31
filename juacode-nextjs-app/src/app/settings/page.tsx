"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import styles from '../profile/profile.module.css';
import AvatarPlaceholder from '@/components/AvatarPlaceholder/AvatarPlaceholder';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSignOutAlt, faSun, faMoon, faCog, faEnvelope, faKey } from '@fortawesome/free-solid-svg-icons';

export default function SettingsPage() {
  const router = useRouter();
  const { isUserAuthenticated, userData, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    router.push('/chat');
  };

  const handleLogout = () => {
    logout();
  };

  // Email change form state
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');

  // Password change (reset) form
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMessage('');
    if (!currentEmail || !newEmail || !confirmEmail) {
      setEmailMessage('Please fill in all the fields.');
      return;
    }
    if (newEmail !== confirmEmail) {
      setEmailMessage('E-mail addresses do not match.');
      return;
    }
    if (currentEmail.trim().toLowerCase() !== userData?.email?.toLowerCase()) {
      setEmailMessage('Current e-mail does not match your account.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/users/me/email', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ current_email: currentEmail, new_email: newEmail, current_password: currentPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailMessage(data.error || 'Failed to update e-mail.');
      } else {
        setEmailMessage('Verification e-mail sent. Please check your inbox.');
        setShowEmailForm(false);
      }
    } catch (err) {
      setEmailMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setPasswordMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMessage(data.error || 'Failed to send reset e-mail.');
      } else {
        setPasswordMessage('Password reset e-mail sent. Please check your inbox.');
        setShowPasswordForm(false);
      }
    } catch (err) {
      setPasswordMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isUserAuthenticated || !userData) {
    return <div className={styles.loadingMessage}>Loading settings...</div>;
  }

  return (
    <div className={styles.profilePageContainer}>
      <div className={styles.profilePageHeader}>
        <button aria-label="Back to Chat" onClick={handleBack} className={styles.profileBackButton}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h2>Settings</h2>
        <div className={styles.themeToggleButtonContainer}>
          <button
            onClick={toggleTheme}
            className={styles.themeToggleButton}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
          </button>
        </div>
      </div>
      <AvatarPlaceholder username={userData?.username ?? null} />
      <div className={styles.profileDetails}>
        <div className={styles.profileDetailItem}>
          <FontAwesomeIcon icon={faEnvelope} className={styles.profileDetailIcon} />
          <div className={styles.profileFieldLabel}>Change Email</div>
          <button className={styles.profileEditButton} onClick={() => { setShowEmailForm(v => !v); setShowPasswordForm(false); }}>
            <FontAwesomeIcon icon={faCog} />
          </button>
        </div>
        {showEmailForm && (
          <form onSubmit={handleEmailSubmit} className={styles.profileFormSection}>
            <label className={styles.profileFieldLabel}>New E-mail</label>
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required className={styles.profileNameInput} autoComplete="email" />
            <label className={styles.profileFieldLabel}>Confirm New E-mail</label>
            <input type="email" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} required className={styles.profileNameInput} autoComplete="email" />
            <label className={styles.profileFieldLabel}>Current E-mail</label>
            <input type="email" value={currentEmail} onChange={e => setCurrentEmail(e.target.value)} required className={styles.profileNameInput} autoComplete="email" />
            <label className={styles.profileFieldLabel}>Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className={styles.profileNameInput} autoComplete="current-password" />
            {emailMessage && <div style={{ color: '#e0b400', marginTop: 8 }}>{emailMessage}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="submit" className={styles.profileEditButton} disabled={loading}>{loading ? 'Submitting…' : 'Submit'}</button>
              <button type="button" className={styles.profileEditButton} onClick={() => setShowEmailForm(false)}>Cancel</button>
            </div>
          </form>
        )}
        <div className={styles.profileDetailItem}>
          <FontAwesomeIcon icon={faKey} className={styles.profileDetailIcon} />
          <div className={styles.profileFieldLabel}>Change Password</div>
          <button className={styles.profileEditButton} onClick={() => { setShowPasswordForm(v => !v); setShowEmailForm(false); }}>
            <FontAwesomeIcon icon={faCog} />
          </button>
        </div>
        {showPasswordForm && (
          <div className={styles.profileFormSection}>
            <p>We will send a reset-password link to your current e-mail. Continue?</p>
            {passwordMessage && <div style={{ color: '#e0b400', marginTop: 8 }}>{passwordMessage}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className={styles.profileEditButton} onClick={handlePasswordReset} disabled={loading}>{loading ? 'Sending…' : 'Send Link'}</button>
              <button className={styles.profileEditButton} onClick={() => setShowPasswordForm(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
      <button className={styles.profileLogoutButton} onClick={handleLogout}>
        <FontAwesomeIcon icon={faSignOutAlt} /> Logout
      </button>
    </div>
  );
} 