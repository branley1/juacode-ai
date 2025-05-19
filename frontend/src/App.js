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
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(() => localStorage.getItem('isUserAuthenticated') === 'true');

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    if (isUserAuthenticated && currentView === 'login') {
      setCurrentView('chat');
    }
  }, [isUserAuthenticated, currentView]);

  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  const handleStartChatting = () => {
    if (isUserAuthenticated) {
      setCurrentView('chat');
    } else {
      setCurrentView('login');
    }
  };

  const handleLoginSuccess = (user) => {
    localStorage.setItem('isUserAuthenticated', 'true');
    if (user) {
      localStorage.setItem('juaUser', JSON.stringify(user));
    }
    setIsUserAuthenticated(true);
    setCurrentView('chat');
  };
  
  const handleNavigateToRegister = () => {
    setCurrentView('register');
  };

  const handleNavigateToLogin = () => {
    setCurrentView('login');
  }

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
    contentToRender = <Login {...commonPageProps} onLoginSuccess={handleLoginSuccess} onNavigateToRegister={handleNavigateToRegister} setCurrentView={setCurrentView} />;
  } else if (currentView === 'register') {
    contentToRender = <RegisterUser {...commonPageProps} onNavigateToLogin={handleNavigateToLogin} setCurrentView={setCurrentView} />;
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