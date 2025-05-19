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
        setUserData({ name: 'Guest', email: 'N/A', user_id: 'N/A' });
      }
    } else {
      setUserData({ name: 'Guest', email: 'N/A', user_id: 'N/A' });
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

  if (!isUserAuthenticated) {
    return (
      <div className="profile-page-container">
        <h2>Profile</h2>
        <p>Please log in to view your profile.</p>
        <button 
          className="profile-login-button"
          onClick={onNavigateToLogin}
        >
          Login
        </button>
        <button 
          className="profile-back-button"
          onClick={handleBack}
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="profile-page-container">
      <div className="profile-page-header">
        <button 
          className="profile-back-button"
          onClick={handleBack}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h1>Your Profile</h1>
      </div>

      <div className="profile-details">
        <div className="profile-detail-item">
          <div className="profile-detail-icon">
            <FontAwesomeIcon icon={faUserCircle} />
          </div>
          <div className="profile-detail-label">Name:</div>
          <div className="profile-detail-value">{userData?.name || 'Not available'}</div>
        </div>

        <div className="profile-detail-item">
          <div className="profile-detail-icon">
            <FontAwesomeIcon icon={faEnvelope} />
          </div>
          <div className="profile-detail-label">Email:</div>
          <div className="profile-detail-value">{userData?.email || 'Not available'}</div>
        </div>

        <div className="profile-detail-item">
          <div className="profile-detail-icon">
            <FontAwesomeIcon icon={faIdBadge} />
          </div>
          <div className="profile-detail-label">User ID:</div>
          <div className="profile-detail-value">{userData?.id || 'Not available'}</div>
        </div>
      </div>

      <button 
        className="profile-logout-button"
        onClick={handleLogout}
      >
        <FontAwesomeIcon icon={faSignOutAlt} /> Logout
      </button>
    </div>
  );
}

export default ProfilePage; 