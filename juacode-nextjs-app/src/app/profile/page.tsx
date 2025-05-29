'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import styles from './profile.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faIdCard, faArrowLeft, faSignOutAlt, faSun, faMoon } from '@fortawesome/free-solid-svg-icons';

export default function ProfilePage() {
  const router = useRouter();
  const { isUserAuthenticated, userData, logout, fetchUserData } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    if (!isUserAuthenticated) {
      // If not authenticated and no userData yet, try to fetch it (in case of direct navigation or refresh)
      // AuthContext's checkAuthOnMount should handle initial load from localStorage
      // If still not authenticated after that, redirect to login.
      const timeoutId = setTimeout(() => {
        if (!isUserAuthenticated && !localStorage.getItem('access_token')) {
          router.push('/login');
        }
      }, 100); // Short delay to allow AuthContext to initialize
      return () => clearTimeout(timeoutId);
    } else if (!userData && fetchUserData) {
        // If authenticated but userData is somehow null, try fetching it.
        fetchUserData();
    }
  }, [isUserAuthenticated, userData, router, fetchUserData]);

  const handleBack = () => {
    router.push('/chat');
  };

  const handleLogout = () => {
    logout(); // AuthContext logout will handle clearing data and redirecting
  };

  if (!isUserAuthenticated || !userData) {
    // Show loading or a redirecting message while AuthContext initializes or redirects
    return <div className={styles.loadingMessage}>Loading profile...</div>;
  }

  return (
    <div className={styles.profilePageContainer}>
      <div className={styles.profilePageHeader}>
        <button onClick={handleBack} className={styles.profileBackButton}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Chat
        </button>
        <div className={styles.themeToggleButtonContainer}>
            <button 
                onClick={toggleTheme} 
                className={styles.themeToggleButton}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
                <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
            </button>
        </div>
        <h1>Account Details</h1>
      </div>

      <div className={styles.profileDetails}>
        <div className={styles.profileDetailItem}>
          <FontAwesomeIcon icon={faUser} className={styles.profileDetailIcon} />
          <div className={styles.profileFieldLabel}>Name:</div>
          <div className={styles.profileFieldValue}>{userData?.username || 'N/A'}</div>
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
          <div className={styles.profileFieldLabel}>Joined:</div>
          <div className={styles.profileFieldValue}>{userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : 'N/A'}</div>
        </div>

      </div>

      <button className={styles.profileLogoutButton} onClick={handleLogout}>
        <FontAwesomeIcon icon={faSignOutAlt} /> Logout
      </button>
    </div>
  );
} 