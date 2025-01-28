import React, { useState, useEffect, useRef } from 'react';
import JuaCodeIcon from '../../assets/jua-code-logo.png';
import './ChatMessage.css';

function ChatMessage({ role, content, isLatestMessage, chatMessagesRef}) {
  const [displayText, setDisplayText] = useState('');
  const [charIndex, setCharIndex] = useState(0);
  const [isUserScrollingUp, setIsUserScrollingUp] = useState(false);
  const lastScrollTimeRef = useRef(0);
  const lastScrollPositionRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!chatMessagesRef?.current) return;
  
      const container = chatMessagesRef.current;
  
      // Check if the user is at the bottom
      const isAtBottom =
        container.scrollHeight - container.scrollTop === container.clientHeight;
  
      if (isAtBottom) {
        setIsUserScrollingUp(false); // Resume autoscroll
      } else {
        setIsUserScrollingUp(true); // Pause autoscroll
      }
  
      // Update the last known scroll position
      lastScrollPositionRef.current = container.scrollTop;
    };
  
    if (chatMessagesRef?.current) {
      const container = chatMessagesRef.current;
  
      // Attach a scroll listener to track user interaction
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [chatMessagesRef]);
  
  useEffect(() => {
    if (role === 'assistant' && isLatestMessage) {
      if (!isUserScrollingUp) {
        // Ensure autoscroll immediately when typing starts
        if (chatMessagesRef?.current) {
          chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
      }
  
      if (charIndex < content.length) {
        const typingTimer = setTimeout(() => {
          setDisplayText((prevText) => prevText + content[charIndex]);
          setCharIndex((prevIndex) => prevIndex + 1);
  
          // Continue autoscrolling during typing if the user has not scrolled up
          if (!isUserScrollingUp && chatMessagesRef?.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
          }
        }, 2.5); // Typing speed in ms per character
  
        return () => clearTimeout(typingTimer);
      } else {
        setDisplayText(content);
      }
    } else if (role === 'user') {
      setDisplayText(content);
  
      // Scroll to the bottom for user messages unless the user scrolled up
      if (!isUserScrollingUp && chatMessagesRef?.current) {
        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
      }
    }
  }, [role, content, charIndex, isLatestMessage, isUserScrollingUp, chatMessagesRef]);

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