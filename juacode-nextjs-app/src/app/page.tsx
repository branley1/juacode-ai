'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import './landing.css';
import JuaCodeLogo from '@/assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSignInAlt, faCog, faSun, faMoon, faUserCircle } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function LandingPage() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { isDarkMode, toggleTheme } = useTheme();
  const { isUserAuthenticated, logout } = useAuth();

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        const profileButton = document.querySelector('.landing-profile-menu-button');
        if (profileButton && profileButton.contains(event.target as Node)) {
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

  const handleStartChatting = () => {
    if (isUserAuthenticated) {
      router.push('/chat');
    } else {
      router.push('/login');
    }
    setIsProfileMenuOpen(false);
  };

  const handleNavigateToProfile = () => {
    router.push('/profile');
    setIsProfileMenuOpen(false);
  };
  
  const handleLogin = () => {
    router.push('/login');
    setIsProfileMenuOpen(false);
  }

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
                        <button onClick={handleNavigateToProfile} className="profile-dropdown-item">
                            <FontAwesomeIcon icon={faUserCircle} /> My Account
                        </button>
                        <button onClick={handleStartChatting} className="profile-dropdown-item">
                            <FontAwesomeIcon icon={faSignInAlt} /> Start Chatting
                        </button>
                        <button onClick={() => { logout(); setIsProfileMenuOpen(false);}} className="profile-dropdown-item">
                            <FontAwesomeIcon icon={faSignInAlt} /> Logout
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={handleLogin} className="profile-dropdown-item">
                            <FontAwesomeIcon icon={faSignInAlt} /> Log In
                        </button>
                    </>
                )}
                <button onClick={() => { toggleTheme(); setIsProfileMenuOpen(false); }} className="profile-dropdown-item">
                    <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} /> {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button onClick={() => { router.push('/settings'); setIsProfileMenuOpen(false); }} className="profile-dropdown-item">
                    <FontAwesomeIcon icon={faCog} /> Settings
                </button>
            </div>
        )}
      </div>
      <main className="landing-main">
        <header className="landing-header">
          <Image src={JuaCodeLogo} alt="JuaCode Logo" className="landing-logo-img" width={80} height={80} priority />
          <h1 className="landing-title-text">JuaCode AI</h1>
        </header>
        <p className="landing-description-text">
          Your intelligent coding assistant. Let's build something amazing together.
        </p>
        <div className="landing-cta-container">
          <button
            className="landing-cta-button"
            onClick={handleStartChatting}
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
