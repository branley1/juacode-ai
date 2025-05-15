import React, { useState, useEffect } from 'react';
import './ProfilePage.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faUserCircle, faEnvelope, faIdBadge, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

function ProfilePage({ setCurrentView, isDarkMode, isUserAuthenticated, onNavigateToLogin }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('juaUser');
    if (storedUser) {
      try {
        setUserData(JSON.parse(storedUser));
      } catch (e) {
        console.error("Error parsing user data from localStorage", e);
        setUserData({ username: 'Guest', email: 'N/A', user_id: 'N/A' });
      }
    } else {
      setUserData({ username: 'Guest', email: 'N/A', user_id: 'N/A' });
    }
  }, []);

  const handleBack = () => {
    const isAuthenticated = localStorage.getItem('isUserAuthenticated') === 'true';
    setCurrentView(isAuthenticated ? 'chat' : 'landing');
  };

  const handleLogout = () => {
    localStorage.removeItem('isUserAuthenticated');
    localStorage.removeItem('juaUser');
    setCurrentView('login'); 
  };

  return (
    <div className={`profile-page-container ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="profile-page-header">
        <button onClick={handleBack} className="profile-back-button">
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        {isUserAuthenticated ? (
          <h1>Account</h1>
        ) : (
          <button onClick={onNavigateToLogin} className="profile-login-button">
            Log In
          </button>
        )}
      </div>
      {userData ? (
        <div className="profile-details">
          <div className="profile-detail-item">
            <FontAwesomeIcon icon={faUserCircle} className="profile-detail-icon" />
            <div>
              <span className="profile-detail-label">Username:</span>
              <span className="profile-detail-value">{userData.username || 'N/A'}</span>
            </div>
          </div>
          <div className="profile-detail-item">
            <FontAwesomeIcon icon={faEnvelope} className="profile-detail-icon" />
            <div>
              <span className="profile-detail-label">Email:</span>
              <span className="profile-detail-value">{userData.email || 'N/A'}</span>
            </div>
          </div>
          <div className="profile-detail-item">
            <FontAwesomeIcon icon={faIdBadge} className="profile-detail-icon" />
            <div>
              <span className="profile-detail-label">User ID:</span>
              <span className="profile-detail-value">{userData.user_id || 'N/A'}</span>
            </div>
          </div>
        </div>
      ) : (
        <p>Loading profile...</p>
      )}
      {isUserAuthenticated && (
        <button onClick={handleLogout} className="profile-logout-button">
          <FontAwesomeIcon icon={faSignOutAlt} /> Log Out
        </button>
      )}
    </div>
  );
}

export default ProfilePage; 