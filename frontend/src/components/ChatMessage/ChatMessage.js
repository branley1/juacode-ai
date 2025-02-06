import React, { useState, useEffect } from 'react';
import JuaCodeIcon from '../../assets/jua-code-logo.png';
import ThoughtBlock from '../ThoughtBlock/ThoughtBlock';
import './ChatMessage.css';
import ReactMarkdown from 'react-markdown';

function extractThoughtAndMain(content) {
  const startIndex = content.indexOf('<think>');
  if (startIndex === -1) {
    // No thought block present.
    return { mainContent: content, thoughtContent: null };
  }
  const endIndex = content.indexOf('</think>');
  if (endIndex !== -1 && endIndex > startIndex) {
    // Both opening and closing tags are present.
    const thoughtContent = content.substring(startIndex + 7, endIndex).trim();
    const mainContent = (content.substring(0, startIndex) + content.substring(endIndex + 8)).trim();
    return { mainContent, thoughtContent };
  } else {
    // The closing tag hasn't arrived yet, so stream what we have.
    const thoughtContent = content.substring(startIndex + 7).trim();
    const mainContent = content.substring(0, startIndex).trim();
    return { mainContent, thoughtContent };
  }
}

function ChatMessage({ role, content, isLatestMessage, chatMessagesRef, index }) {
  const [displayText, setDisplayText] = useState('');
  const [charIndex, setCharIndex] = useState(0);
  const [parsedContent, setParsedContent] = useState({ mainContent: '', thoughtContent: null });

  useEffect(() => {
    // Each time the content updates (as tokens stream in), extract the thought block.
    const parsed = extractThoughtAndMain(content);
    setParsedContent(parsed);
    setDisplayText('');
    setCharIndex(0);
  }, [content]);

  useEffect(() => {
    if (role !== 'assistant' || !isLatestMessage) {
      setDisplayText(parsedContent.mainContent);
      return;
    }
    if (charIndex < parsedContent.mainContent.length) {
      const timer = setTimeout(() => {
        setDisplayText(parsedContent.mainContent.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, 5);
      return () => clearTimeout(timer);
    } else {
      if (chatMessagesRef.current) {
        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
      }
    }
  }, [role, parsedContent.mainContent, charIndex, isLatestMessage, chatMessagesRef]);

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
      id={`message-${index}`}
    >
      {role === 'assistant' && (
        <img src={JuaCodeIcon} alt="JuaCode Icon" className="profile-icon" />
      )}
      <div className="message-area">
        {parsedContent.thoughtContent && (
          <ThoughtBlock thought={parsedContent.thoughtContent} />
        )}
        <div className="message-content">
          <ReactMarkdown>
            {role === 'assistant' && isLatestMessage ? displayText : parsedContent.mainContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;