import React, { useState, useEffect, useRef } from 'react';
import './LandingPage.css';
import JuaCodeLogo from '../../assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon, faUser } from '@fortawesome/free-solid-svg-icons';

function LandingPage({ onStartChatting, isDarkMode, toggleTheme }) {
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
      <button onClick={toggleTheme} className="theme-toggle-button page-theme-toggle landing-theme-toggle" title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
        <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
      </button>
      <div className="landing-profile-menu-container" ref={profileMenuRef}>
        <button className="profile-menu-button landing-profile-menu-button" onClick={toggleProfileMenu} title="Profile and Settings">
            <FontAwesomeIcon icon={faUser} />
        </button>
        {isProfileMenuOpen && (
            <div className="profile-dropdown-menu landing-profile-dropdown-menu">
                <button onClick={() => { alert('Log In clicked!'); setIsProfileMenuOpen(false); }} className="profile-dropdown-item">
                    Log In
                </button>
                <button onClick={() => { toggleTheme(); setIsProfileMenuOpen(false); }} className="profile-dropdown-item">
                    {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button onClick={() => { alert('Settings clicked!'); setIsProfileMenuOpen(false); }} className="profile-dropdown-item">
                    Settings
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