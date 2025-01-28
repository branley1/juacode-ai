// frontend App.js file where we render the ChatInterface component
import React from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface/ChatInterface';

function App() {
  return (
    <div className="App">
      <ChatInterface /> {/* Render the ChatInterface component */}
    </div>
  );
}

export default App;