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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true' || savedMode === null; // Default to dark mode
  });
  const [currentView, setCurrentView] = useState('landing');
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [userData, setUserData] = useState(null);

  // Effect to check authentication on mount
  useEffect(() => {
    // Check if user data exists in local storage
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData);
        setUserData(parsedUserData);
        setIsUserAuthenticated(true);
      } catch (e) {
        console.error('Error parsing stored user data:', e);
        setIsUserAuthenticated(false);
        localStorage.removeItem('userData');
        localStorage.removeItem('isAuthenticated');
      }
    } else {
      setIsUserAuthenticated(false);
    }
  }, []);

  // Update body class when dark mode changes
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);

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
    // Set authentication state
    setIsUserAuthenticated(true);
    
    // Store user data
    setUserData(user);
    localStorage.setItem('userData', JSON.stringify(user));
    localStorage.setItem('isAuthenticated', 'true');
    
    // Redirect to chat
    setCurrentView('chat');
  };

  const handleNavigateToRegister = () => {
    setCurrentView('register');
  };

  const handleNavigateToLogin = () => {
    setCurrentView('login');
  };

  const handleNavigateToProfile = () => {
    setCurrentView('profile');
  };

  const handleLogout = () => {
    // Clear auth state
    setIsUserAuthenticated(false);
    setUserData(null);
    
    // Clear local storage
    localStorage.removeItem('userData');
    localStorage.removeItem('isAuthenticated');
    
    // Redirect to login
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
    contentToRender = <ChatInterface setCurrentView={setCurrentView} onNavigateToLogin={handleNavigateToLogin} isDarkMode={isDarkMode} isUserAuthenticated={isUserAuthenticated} onLogout={handleLogout} userData={userData} onNavigateToProfile={handleNavigateToProfile} />;
  } else if (currentView === 'profile') {
    contentToRender = <ProfilePage setCurrentView={setCurrentView} isDarkMode={isDarkMode} toggleTheme={toggleTheme} isUserAuthenticated={isUserAuthenticated} onNavigateToLogin={handleNavigateToLogin} onLogout={handleLogout} userData={userData} />;
  }

  return (
    <ErrorBoundary>
      <MobileDetector>
        <div className={`app-container ${isDarkMode ? 'dark-theme' : 'light-theme'}`} style={{ backgroundColor: 'var(--color-background-body)' }}>
            {contentToRender}
        </div>
      </MobileDetector>
    </ErrorBoundary>
  );
}

export default App;