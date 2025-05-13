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

function ChatMessage({ role, content, chatMessagesRef, index, streamingIndex }) {
  const [displayText, setDisplayText] = useState('');
  const [charIndex, setCharIndex] = useState(0);
  const [parsedContent, setParsedContent] = useState({ mainContent: '', thoughtContent: null });

  useEffect(() => {
    // Each time the content updates (as tokens stream in), extract the thought block.
    const parsed = extractThoughtAndMain(content);
    setParsedContent(parsed);
    // Reset animation state only if this message is the one actively streaming
    if (role === 'assistant' && index === streamingIndex) {
      setDisplayText('');
      setCharIndex(0);
    } else {
        // If not streaming this message, display full content immediately
        setDisplayText(parsed.mainContent);
    }
  }, [content, role, index, streamingIndex]);

  useEffect(() => {
    // Condition changed: animate only if role is assistant AND this message index matches the streaming index
    if (role !== 'assistant' || index !== streamingIndex) {
      // If not the assistant message currently streaming, ensure full text is displayed
      // (This might be redundant with the effect above, but ensures correctness)
       if (displayText !== parsedContent.mainContent) {
          setDisplayText(parsedContent.mainContent);
       }
      return;
    }

    // Animation logic (only runs if index === streamingIndex)
    if (charIndex < parsedContent.mainContent.length) {
      const timer = setTimeout(() => {
        setDisplayText(parsedContent.mainContent.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, 5);
      return () => clearTimeout(timer);
    } else {
      if (chatMessagesRef.current) {
        // Auto-scroll might be better handled in the parent ChatInterface after streamingIndex becomes null
        // requestAnimationFrame(() => { 
        //  chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        // });
      }
    }
  }, [role, parsedContent.mainContent, charIndex, index, streamingIndex, chatMessagesRef, displayText]); 

  // Removed the useEffect for focusing based on isLatestMessage
  // Focus management can be handled differently if needed.

  return (
    <div
      className={`chat-message ${role}`}
      tabIndex={-1} // Changed from 0 to -1 as programmatic focus was removed
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
            {/* Condition changed: Use displayText for animation only if index matches streamingIndex */}
            {role === 'assistant' && index === streamingIndex ? displayText : parsedContent.mainContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;