// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface/ChatInterface';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import MobileDetector from './components/MobileDetector';
import LandingPage from './components/LandingPage/LandingPage';
import Login from './components/Login/Login';
import RegisterUser from './components/RegisterUser/RegisterUser';
import ProfilePage from './components/ProfilePage/ProfilePage';

function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('juaCodeTheme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('juaCodeTheme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('juaCodeTheme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  useEffect(() => {
    const storedAuthStatus = localStorage.getItem('isUserAuthenticated');
    if (storedAuthStatus === 'true') {
      setIsUserAuthenticated(true);
      setCurrentView('chat');
    } else {
      setCurrentView('landing');
    }
  }, []);

  const handleStartChatting = () => {
    if (isUserAuthenticated) {
      setCurrentView('chat');
    } else {
      setCurrentView('login');
    }
  };

  const handleLoginSuccess = () => {
    setIsUserAuthenticated(true);
    localStorage.setItem('isUserAuthenticated', 'true');
    setCurrentView('chat');
  };
  
  const handleNavigateToRegister = () => {
    setCurrentView('register');
  };

  const handleNavigateToLogin = () => {
    setCurrentView('login');
  }

  const handleRegistrationSuccess = () => {
    alert("Registration successful! Please log in.");
    setCurrentView('login');
  };

  const handleNavigateToProfile = () => {
    setCurrentView('profile');
  };

  const handleLogout = () => {
    localStorage.removeItem('isUserAuthenticated');
    localStorage.removeItem('juaUser');
    setIsUserAuthenticated(false);
    setCurrentView('login');
  };

  let contentToRender;
  const commonPageProps = {
    isDarkMode,
    toggleTheme
  };

  if (currentView === 'landing') {
    contentToRender = <LandingPage {...commonPageProps} onStartChatting={handleStartChatting} onNavigateToProfile={handleNavigateToProfile} isUserAuthenticated={isUserAuthenticated} onLogout={handleLogout} />;
  } else if (currentView === 'login') {
    contentToRender = <Login {...commonPageProps} onLoginSuccess={handleLoginSuccess} onNavigateToRegister={handleNavigateToRegister} />;
  } else if (currentView === 'register') {
    contentToRender = <RegisterUser {...commonPageProps} onRegistrationSuccess={handleRegistrationSuccess} onNavigateToLogin={handleNavigateToLogin} />;
  } else if (currentView === 'chat') {
    contentToRender = <ChatInterface setCurrentView={setCurrentView} onNavigateToLogin={handleNavigateToLogin} isDarkMode={isDarkMode} isUserAuthenticated={isUserAuthenticated} onLogout={handleLogout} />;
  } else if (currentView === 'profile') {
    contentToRender = <ProfilePage setCurrentView={setCurrentView} isDarkMode={isDarkMode} toggleTheme={toggleTheme} isUserAuthenticated={isUserAuthenticated} onNavigateToLogin={handleNavigateToLogin} />;
  }

  return (
    <ErrorBoundary>
      <MobileDetector>
        <div className="app-container" style={{ backgroundColor: 'var(--color-background-body)' }}>
            {contentToRender}
        </div>
      </MobileDetector>
    </ErrorBoundary>
  );
}

export default App;