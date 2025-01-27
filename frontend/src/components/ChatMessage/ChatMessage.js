import React, { useState, useEffect } from 'react';
import JuaCodeIcon from '../../assets/jua-code-logo.png';
import './ChatMessage.css';

function ChatMessage({ role, content, isLatestMessage}) {
  const [displayText, setDisplayText] = useState('');
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (role === 'assistant' && isLatestMessage && charIndex < content.length) {
      const typingTimer = setTimeout(() => {
        setDisplayText(prevText => prevText + content[charIndex]);
        setCharIndex(prevIndex => prevIndex + 1);
      }, 2.5); // ms per character, smaller is better
      return () => clearTimeout(typingTimer);
    } else if (role === 'assistant' && charIndex >= content.length) {
      setDisplayText(content);
    } else if (role === 'user') {
      setDisplayText(content);
    } else {
        setDisplayText(content);
    }
  }, [role, content, charIndex, isLatestMessage]);

  return (
    <div className={`chat-message ${role}`}>
      {role === 'assistant' && (
        <img src={JuaCodeIcon} alt="JuaCode Icon" className="profile-icon" />
      )}
      <div className="message-area">
        <div className="message-content">
          {displayText}
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;