import React, { useState, useEffect, useRef } from 'react';
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

function ChatMessage({ role, content, chatMessagesRef, index, streamingIndex }) {
  const [displayText, setDisplayText] = useState('');
  const [charIndex, setCharIndex] = useState(0);
  const [parsedContent, setParsedContent] = useState({ mainContent: '', thoughtContent: null });
  const isInitialStreamForThisMessageRef = useRef(true);

  useEffect(() => {
    const newParsed = extractThoughtAndMain(content);
    setParsedContent(newParsed);

    if (role === 'assistant' && index === streamingIndex) {
      if (isInitialStreamForThisMessageRef.current) {
        setDisplayText('');
        setCharIndex(0);
        isInitialStreamForThisMessageRef.current = false;
      }
    } else {
      setDisplayText(newParsed.mainContent);
      isInitialStreamForThisMessageRef.current = true;
    }
  }, [content, role, index, streamingIndex]);

  useEffect(() => {
    if (index !== streamingIndex && !isInitialStreamForThisMessageRef.current) {
      isInitialStreamForThisMessageRef.current = true;
    }
  }, [index, streamingIndex]);

  useEffect(() => {
    if (role !== 'assistant' || index !== streamingIndex) {
      if (displayText !== parsedContent.mainContent) {
        setDisplayText(parsedContent.mainContent);
      }
      return;
    }

    if (charIndex < parsedContent.mainContent.length) {
      const timer = setTimeout(() => {
        setDisplayText(parsedContent.mainContent.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, 5);
      return () => clearTimeout(timer);
    }
  }, [role, parsedContent.mainContent, charIndex, index, streamingIndex, displayText]);

  return (
    <div
      className={`chat-message ${role}`}
      tabIndex={-1}
      role="article"
      aria-labelledby={`message-${index}-label`}
      id={`message-${index}`}
    >
      {role === 'assistant' && (
        <img src={JuaCodeIcon} alt="JuaCode Icon" className="profile-icon" />
      )}
      <div className="message-area">
        {parsedContent.thoughtContent && (
          <ThoughtBlock thought={parsedContent.thoughtContent} />
        )}
        <div className="message-content" id={`message-${index}-label`}>
          <ReactMarkdown>
            {role === 'assistant' && index === streamingIndex ? displayText : parsedContent.mainContent}
          </ReactMarkdown>
          {role === 'assistant' && index === streamingIndex && charIndex < parsedContent.mainContent.length && (
            <span className="blinking-caret">▍</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;