'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import styles from './profile.module.css';
import AvatarPlaceholder from '@/components/AvatarPlaceholder/AvatarPlaceholder';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faIdCard, faArrowLeft, faSignOutAlt, faSun, faMoon, faCalendarAlt, faEdit } from '@fortawesome/free-solid-svg-icons';

export default function ProfilePage() {
  const router = useRouter();
  const { isUserAuthenticated, userData, logout, fetchUserData, accessToken } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  // State for inline name editing
  const [editing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState<string>(userData?.username || '');

  useEffect(() => {
    if (!isUserAuthenticated) {
      // Redirect to login if not authenticated
      router.push('/login');
    } else if (fetchUserData) {
      // Always fetch latest user profile when authenticated
      fetchUserData();
    }
  }, [isUserAuthenticated, router, fetchUserData]);

  useEffect(() => {
    if (userData?.username) {
      setEditedName(userData.username);
    }
  }, [userData]);

  const handleNameSave = async () => {
    if (!editedName.trim() || editedName.trim() === userData?.username) {
      setEditing(false);
      return;
    }
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ name: editedName.trim() }),
      });
      if (res.ok && fetchUserData) {
        await fetchUserData();
      } else {
        console.error('Failed to update name:', await res.text());
      }
    } catch (error) {
      console.error('Error updating name:', error);
    }
    setEditing(false);
  };

  const handleBack = () => {
    router.push('/chat');
  };

  const handleLogout = () => {
    logout(); // AuthContext logout will handle clearing data and redirecting
  };

  // Dynamic greeting for profile header
  const greeting = userData?.username
    ? `Hi ${userData.username.split(' ')[0]}!`
    : 'Hi there!';

  if (!isUserAuthenticated || !userData) {
    // Show loading or a redirecting message while AuthContext initializes or redirects
    return <div className={styles.loadingMessage}>Loading profile...</div>;
  }

  return (
    <div className={styles.profilePageContainer}>
      <div className={styles.profilePageHeader}>
        <button aria-label="Back to Chat" onClick={handleBack} className={styles.profileBackButton}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h2>{greeting}</h2>
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
          <FontAwesomeIcon icon={faUser} className={styles.profileDetailIcon} />
          <div className={styles.profileFieldLabel}>Name:</div>
          {editing ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); }}
              className={styles.profileNameInput}
              autoFocus
            />
          ) : (
            <>
              <div className={styles.profileFieldValue}>
                {userData?.username || 'N/A'}
              </div>
              <button
                aria-label="Edit Name"
                onClick={() => setEditing(true)}
                className="edit-title-button"
              >
                <FontAwesomeIcon icon={faEdit} />
              </button>
            </>
          )}
        </div>
        
        <div className={styles.profileDetailItem}>
          <FontAwesomeIcon icon={faEnvelope} className={styles.profileDetailIcon} />
          <div className={styles.profileFieldLabel}>Email:</div>
          <div className={styles.profileFieldValue}>{userData?.email || 'N/A'}</div>
        </div>
        
        <div className={styles.profileDetailItem}>
          <FontAwesomeIcon icon={faIdCard} className={styles.profileDetailIcon} />
          <div className={styles.profileFieldLabel}>User ID:</div>
          <div className={styles.profileFieldValue}>{userData?.id || 'N/A'}</div>
        </div>

         <div className={styles.profileDetailItem}>
          <FontAwesomeIcon icon={faCalendarAlt} className={styles.profileDetailIcon} />
          <div className={styles.profileFieldLabel}>Joined:</div>
          <div className={styles.profileFieldValue}>{
            userData?.created_at ? new Date(userData.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'
          }</div>
        </div>

      </div>

      <button className={styles.profileLogoutButton} onClick={handleLogout}>
        <FontAwesomeIcon icon={faSignOutAlt} /> Logout
      </button>
    </div>
  );
} 