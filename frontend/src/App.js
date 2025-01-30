// frontend/src/App.js
import React from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface/ChatInterface';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import MobileDetector from './components/MobileDetector';

function App() {
  return (
    <ErrorBoundary>
      <MobileDetector>
        <ChatInterface />
      </MobileDetector>
    </ErrorBoundary>
  );
}

export default App;