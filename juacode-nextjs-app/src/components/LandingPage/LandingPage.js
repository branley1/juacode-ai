import React, { useState, useEffect, useRef } from 'react';
import './LandingPage.css';
import JuaCodeLogo from '../../assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSignInAlt, faCog, faSun, faMoon, faUserCircle } from '@fortawesome/free-solid-svg-icons';

function LandingPage({ onStartChatting, isDarkMode, toggleTheme, onNavigateToProfile, isUserAuthenticated }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        const profileButton = document.querySelector('.landing-profile-menu-button');
        if (profileButton && profileButton.contains(event.target)) {
          return;
        }
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuRef]);

  return (
    <div className="landing-page-container">
      <div className="landing-profile-menu-container" ref={profileMenuRef}>
        <button className="profile-menu-button landing-profile-menu-button" onClick={toggleProfileMenu} title="Profile and Settings">
            <FontAwesomeIcon icon={faUser} />
        </button>
        {isProfileMenuOpen && (
            <div className="profile-dropdown-menu landing-profile-dropdown-menu">
                {isUserAuthenticated ? (
                    <>
                        <button onClick={() => { onNavigateToProfile(); setIsProfileMenuOpen(false); }} className="profile-dropdown-item">
                            <FontAwesomeIcon icon={faUserCircle} /> My Account
                        </button>
                        <button onClick={() => { onStartChatting(); setIsProfileMenuOpen(false); }} className="profile-dropdown-item">
                            <FontAwesomeIcon icon={faSignInAlt} /> Start Chatting
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => { onStartChatting(); setIsProfileMenuOpen(false); }} className="profile-dropdown-item">
                            <FontAwesomeIcon icon={faSignInAlt} /> Log In
                        </button>
                        <button onClick={() => { onNavigateToProfile(); setIsProfileMenuOpen(false); }} className="profile-dropdown-item">
                            <FontAwesomeIcon icon={faUserCircle} /> View Profile
                        </button>
                    </>
                )}
                <button onClick={() => { toggleTheme(); setIsProfileMenuOpen(false); }} className="profile-dropdown-item">
                    <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} /> {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button onClick={() => { alert('Settings from Landing clicked!'); setIsProfileMenuOpen(false); }} className="profile-dropdown-item">
                    <FontAwesomeIcon icon={faCog} /> Settings
                </button>
            </div>
        )}
      </div>
      <main className="landing-main">
        <header className="landing-header">
          <img src={JuaCodeLogo} alt="JuaCode Logo" className="landing-logo-img" />
          <h1 className="landing-title-text">JuaCode AI</h1>
        </header>
        <p className="landing-description-text">
          Your intelligent coding assistant. Let's build something amazing together.
        </p>
        <div className="landing-cta-container">
          <button
            className="landing-cta-button"
            onClick={onStartChatting}
          >
            Start Chatting
          </button>
        </div>
      </main>
      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} JuaCode. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default LandingPage; 