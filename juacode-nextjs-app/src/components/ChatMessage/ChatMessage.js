import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import JuaCodeIcon from '../../assets/jua-code-logo.png';
import ThoughtBlock from '../ThoughtBlock/ThoughtBlock';
import './ChatMessage.css';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';

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

const CodeBlock = ({node, inline, className, children, ...props}) => {
  const match = /language-(\w+)/.exec(className || '');
  const codeString = String(children).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  if (!inline && match) {
    const language = match[1];
    return (
      <div className="code-block-wrapper">
        <div className="code-header">
          <span className="code-language">{language.toLowerCase()}</span>
          <button className="copy-button" onClick={handleCopy} aria-label="Copy code">
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} size="medium" />
          </button>
        </div>
        <SyntaxHighlighter
          style={tomorrow}
          language={language}
          PreTag="div"
          customStyle={{ margin: 0, padding: '1em', background: 'none', fontSize: '0.9em' }}
          {...props}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    );
  }
  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
};

function ChatMessage({ role, content, index, streamingIndex }) {
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
        <Image src={JuaCodeIcon} alt="JuaCode Icon" className="profile-icon" width={40} height={40} />
      )}
      <div className="message-area">
        {parsedContent.thoughtContent && (
          <ThoughtBlock thought={parsedContent.thoughtContent} />
        )}
        <div className="message-content" id={`message-${index}-label`}>
          {role === 'assistant' ? (
            <ReactMarkdown components={{ code: CodeBlock }}>
              {index === streamingIndex ? displayText : parsedContent.mainContent}
            </ReactMarkdown>
          ) : (
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {parsedContent.mainContent}
            </div>
          )}
          {role === 'assistant' && index === streamingIndex && charIndex < parsedContent.mainContent.length && (
            <span className="blinking-caret">▍</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;