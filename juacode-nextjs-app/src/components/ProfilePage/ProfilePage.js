import React, { useState, useEffect } from 'react';
import './ProfilePage.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faIdCard, faArrowLeft, faSignOutAlt, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/context/AuthContext';

function ProfilePage({ setCurrentView, onLogout }) {
  const { userData, fetchUserData } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await fetchUserData();
      setIsLoading(false);
    };
    
    loadData();
  }, [fetchUserData]);

  const handleBack = () => {
    setCurrentView('chat');
  };

  const handleLogout = () => {
    onLogout();
  };

  if (isLoading) {
    return <div className="profile-page-container">
      <div className="loading-spinner"></div>
      Loading profile details...
    </div>;
  }

  // Log the created_at value
  if (userData) {
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month} ${day}, ${year}`;
    } catch (e) {
      return 'Invalid Date';
    }
  };

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
          <div className="profile-field-value">{userData?.username || 'Guest User'}</div>
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

        <div className="profile-detail-item">
          <FontAwesomeIcon icon={faCalendarAlt} className="profile-detail-icon" />
          <div className="profile-field-label">Joined:</div>
          <div className="profile-field-value">{formatDate(userData?.created_at)}</div>
        </div>
      </div>

      <button className="profile-logout-button" onClick={handleLogout}>
        <FontAwesomeIcon icon={faSignOutAlt} /> Logout
      </button>
    </div>
  );
}

export default ProfilePage; 