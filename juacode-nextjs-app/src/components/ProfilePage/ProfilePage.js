import React, { useState, useEffect } from 'react';
import './ProfilePage.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faIdCard, faArrowLeft, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

function ProfilePage({ setCurrentView, isDarkMode, isUserAuthenticated, onNavigateToLogin, onLogout, userData }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if the user is authenticated
    if (!isUserAuthenticated) {
      onNavigateToLogin();
      return;
    }
    setIsLoading(false);
  }, [isUserAuthenticated, onNavigateToLogin]);

  const handleBack = () => {
    setCurrentView('chat');
  };

  const handleLogout = () => {
    // Use the onLogout prop which handles clearing localStorage and redirecting
    onLogout();
  };

  if (isLoading) {
    return <div className="profile-page-container">Loading profile...</div>;
  }

  return (
    <div className="profile-page-container">
      <div className="profile-page-header">
        <button onClick={handleBack} className="profile-back-button">
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h1>Account Details</h1>
      </div>

      <div className="profile-details">
        <div className="profile-detail-item">
          <FontAwesomeIcon icon={faUser} className="profile-detail-icon" />
          <div className="profile-field-label">Name:</div>
          <div className="profile-field-value">{userData?.name || 'Guest User'}</div>
        </div>
        
        <div className="profile-detail-item">
          <FontAwesomeIcon icon={faEnvelope} className="profile-detail-icon" />
          <div className="profile-field-label">Email:</div>
          <div className="profile-field-value">{userData?.email || 'guest@example.com'}</div>
        </div>
        
        <div className="profile-detail-item">
          <FontAwesomeIcon icon={faIdCard} className="profile-detail-icon" />
          <div className="profile-field-label">User ID:</div>
          <div className="profile-field-value">{userData?.id || 'Not available'}</div>
        </div>
      </div>

      <button className="profile-logout-button" onClick={handleLogout}>
        <FontAwesomeIcon icon={faSignOutAlt} /> Logout
      </button>
    </div>
  );
}

export default ProfilePage; 