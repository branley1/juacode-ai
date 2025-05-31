import React, { useState } from 'react';
import styles from './SettingsModal.module.css';
import { useAuth } from '@/context/AuthContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewState = 'menu' | 'email' | 'password' | 'success';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { accessToken } = useAuth();
  const [view, setView] = useState<ViewState>('menu');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Email change states
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

  const resetForm = () => {
    setNewEmail('');
    setConfirmEmail('');
    setCurrentPassword('');
    setMessage('');
    setLoading(false);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!newEmail || !confirmEmail) {
      setMessage('Please fill in all the fields.');
      return;
    }
    if (newEmail !== confirmEmail) {
      setMessage('E-mail addresses do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users/me/email', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ new_email: newEmail, current_password: currentPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Failed to update e-mail.');
      } else {
        setView('success');
        setMessage('Verification e-mail sent. Please check your inbox.');
      }
    } catch (err) {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!accessToken) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Failed to send reset e-mail.');
      } else {
        setView('success');
        setMessage('Password reset e-mail sent. Please check your inbox.');
      }
    } catch (err) {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const closeAndReset = () => {
    onClose();
    setView('menu');
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={closeAndReset}>&times;</button>
        {view === 'menu' && (
          <div className={styles.menuWrapper}>
            <h2>Settings</h2>
            <button className={styles.actionButton} onClick={() => { resetForm(); setView('email'); }}>Change E-mail</button>
            <button className={styles.actionButton} onClick={() => { resetForm(); setView('password'); }}>Change Password</button>
          </div>
        )}

        {view === 'email' && (
          <form onSubmit={handleEmailSubmit} className={styles.formWrapper}>
            <h3>Change E-mail</h3>
            <label>New E-mail</label>
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            <label>Confirm New E-mail</label>
            <input type="email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} required />
            <label>Current Password (optional)</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            {message && <p className={styles.message}>{message}</p>}
            <div className={styles.formActions}>
              <button type="submit" className={styles.submitButton} disabled={loading}>{loading ? 'Submitting…' : 'Submit'}</button>
              <button type="button" className={styles.backButton} onClick={() => setView('menu')}>Back</button>
            </div>
          </form>
        )}

        {view === 'password' && (
          <div className={styles.confirmWrapper}>
            <h3>Reset Password</h3>
            <p>We will send a reset-password link to your current e-mail. Continue?</p>
            {message && <p className={styles.message}>{message}</p>}
            <div className={styles.formActions}>
              <button className={styles.submitButton} onClick={handlePasswordSubmit} disabled={loading}>{loading ? 'Sending…' : 'Send Link'}</button>
              <button className={styles.backButton} onClick={() => setView('menu')}>Back</button>
            </div>
          </div>
        )}

        {view === 'success' && (
          <div className={styles.successWrapper}>
            <p>{message}</p>
            <button className={styles.actionButton} onClick={closeAndReset}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal; 