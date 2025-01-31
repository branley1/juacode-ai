import React, { useState, useEffect } from 'react';
import JuaCodeIcon from '../../assets/jua-code-logo.png';
import './ChatMessage.css';

function ChatMessage({ role, content, isLatestMessage, chatMessagesRef, index }) {
  const [displayText, setDisplayText] = useState('');
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (role !== 'assistant' || !isLatestMessage) {
      setDisplayText(content);
      return;
    }
  
    if (charIndex < content.length) {
      const typingTimer = setTimeout(() => {
        setDisplayText(content.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, 2.5);
      return () => clearTimeout(typingTimer);
    } else {
      // Scroll to the bottom once typing is complete
      if (chatMessagesRef.current) {
        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
      }
    }
  }, [role, content, charIndex, isLatestMessage, chatMessagesRef]);

  useEffect(() => {
    if (isLatestMessage) {
      const messageElement = document.getElementById(`message-${index}`);
      messageElement?.focus();
    }
  }, [isLatestMessage, index]);

  return (
    <div
      className={`chat-message ${role}`}
      tabIndex={0}
      role="article"
      aria-labelledby={`message-${index}`}
    >
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