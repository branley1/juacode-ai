import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import JuaCodeIcon from '../../assets/jua-code-logo.png';
import ThoughtBlock from '../ThoughtBlock/ThoughtBlock';
import './ChatMessage.css';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '@/context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck, faThumbsUp, faThumbsDown, faSync, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import remarkGfm from 'remark-gfm';
import PropTypes from 'prop-types';

function extractThoughtAndMain(content) {
  if (!content) return { mainContent: '', thoughtContent: null };
  
  const startIndex = content.indexOf('<think>');
  if (startIndex === -1) {
    return { mainContent: content, thoughtContent: null };
  }
  const endIndex = content.indexOf('</think>');
  if (endIndex !== -1 && endIndex > startIndex) {
    const thoughtContent = content.substring(startIndex + 7, endIndex).trim();
    const mainContent = (content.substring(0, startIndex) + content.substring(endIndex + 8)).trim();
    return { mainContent, thoughtContent };
  } else {
    const thoughtContent = content.substring(startIndex + 7).trim();
    const mainContent = content.substring(0, startIndex).trim();
    return { mainContent, thoughtContent };
  }
}

const CodeBlock = ({node, inline, className, children, ...props}) => {
  const { isDarkMode } = useTheme();
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
          <button className="copy-button" onClick={handleCopy} aria-label={copied ? 'Copied' : 'Copy code'}>
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} size="sm" />
            <span className="copy-text">{copied ? 'Copied' : 'Copy code'}</span>
          </button>
        </div>
        <SyntaxHighlighter
          style={isDarkMode ? vscDarkPlus : oneLight}
          language={language}
          PreTag="div"
          customStyle={{ margin: 0, padding: '1em', fontSize: '0.9em' }}
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

// Custom components for better markdown rendering
const MarkdownComponents = {
  code: CodeBlock,
  
  // Enhanced list rendering
  ul: ({node, children, ...props}) => (
    <ul {...props}>
      {children}
    </ul>
  ),
  
  ol: ({node, children, ...props}) => (
    <ol {...props}>
      {children}
    </ol>
  ),
  
  li: ({node, children, ...props}) => (
    <li {...props}>
      {children}
    </li>
  ),
  
  // Enhanced paragraph rendering
  p: ({node, children, ...props}) => (
    <p {...props}>
      {children}
    </p>
  ),
  
  // Enhanced heading rendering
  h1: ({node, children, ...props}) => (
    <h1 {...props}>
      {children}
    </h1>
  ),
  
  h2: ({node, children, ...props}) => (
    <h2 {...props}>
      {children}
    </h2>
  ),
  
  h3: ({node, children, ...props}) => (
    <h3 {...props}>
      {children}
    </h3>
  ),
  
  h4: ({node, children, ...props}) => (
    <h4 {...props}>
      {children}
    </h4>
  ),
  
  h5: ({node, children, ...props}) => (
    <h5 {...props}>
      {children}
    </h5>
  ),
  
  h6: ({node, children, ...props}) => (
    <h6 {...props}>
      {children}
    </h6>
  ),
  
  // Enhanced blockquote rendering
  blockquote: ({node, children, ...props}) => (
    <blockquote {...props}>
      {children}
    </blockquote>
  ),
  
  // Enhanced table rendering
  table: ({node, children, ...props}) => (
    <table {...props}>
      {children}
    </table>
  ),
  
  thead: ({node, children, ...props}) => (
    <thead {...props}>
      {children}
    </thead>
  ),
  
  tbody: ({node, children, ...props}) => (
    <tbody {...props}>
      {children}
    </tbody>
  ),
  
  tr: ({node, children, ...props}) => (
    <tr {...props}>
      {children}
    </tr>
  ),
  
  th: ({node, children, ...props}) => (
    <th {...props}>
      {children}
    </th>
  ),
  
  td: ({node, children, ...props}) => (
    <td {...props}>
      {children}
    </td>
  ),
  
  // Enhanced link rendering
  a: ({node, children, href, ...props}) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
  
  // Enhanced horizontal rule
  hr: ({node, ...props}) => (
    <hr {...props} />
  ),
  
  // Enhanced emphasis and strong
  em: ({node, children, ...props}) => (
    <em {...props}>
      {children}
    </em>
  ),
  
  strong: ({node, children, ...props}) => (
    <strong {...props}>
      {children}
    </strong>
  )
};

function ChatMessage({ 
  role, 
  content = '', 
  index, 
  streamingIndex, 
  lastModelUsed, 
  onRate, 
  onRerun, 
  availableModels = [],
  responseIndex = 0,
  totalResponses = 1,
  onResponseChange
}) {
  const [displayText, setDisplayText] = useState('');
  const [charIndex, setCharIndex] = useState(0);
  const [parsedContent, setParsedContent] = useState({ mainContent: '', thoughtContent: null });
  const [isCopied, setIsCopied] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const isInitialStreamForThisMessageRef = useRef(true);
  const { isDarkMode } = useTheme();
  const modelSelectorRef = useRef(null);

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(parsedContent.mainContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleRate = (rating) => {
    if (onRate) {
      onRate(index, rating);
    }
  };

  const handleModelSelect = (model) => {
    if (onRerun) {
      onRerun(index, model);
    }
    setIsModelSelectorOpen(false);
  };

  const handleResponseChange = (direction) => {
    if (onResponseChange) {
      onResponseChange(direction);
    }
  };

  // Effect to handle clicks outside the model selector
  useEffect(() => {
    function handleClickOutside(event) {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target)) {
        setIsModelSelectorOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [modelSelectorRef]);

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
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
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
        {role === 'assistant' && (
          <div className="message-actions">
            <button 
              className="message-action-button copy-button" 
              onClick={handleCopy}
              title="Copy message"
            >
              <FontAwesomeIcon icon={isCopied ? faCheck : faCopy} />
            </button>
            <button 
              className="message-action-button rate-button" 
              onClick={() => handleRate('good')}
              title="Rate as good"
            >
              <FontAwesomeIcon icon={faThumbsUp} />
            </button>
            <button 
              className="message-action-button rate-button" 
              onClick={() => handleRate('bad')}
              title="Rate as bad"
            >
              <FontAwesomeIcon icon={faThumbsDown} />
            </button>
            <div className="model-selector-container" ref={modelSelectorRef}>
              <button 
                className="message-action-button model-button" 
                onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                title="Switch model"
              >
                <FontAwesomeIcon icon={faSync} />
              </button>
              {isModelSelectorOpen && (
                <div className="model-selector-dropdown">
                  {availableModels.map(model => (
                    <button
                      key={model.value}
                      className={`model-option ${model.value === lastModelUsed ? 'selected' : ''}`}
                      onClick={() => handleModelSelect(model.value)}
                    >
                      {model.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {totalResponses > 1 && (
              <div className="response-navigation">
                <button
                  className="response-nav-button"
                  onClick={() => handleResponseChange('prev')}
                  disabled={responseIndex === 0}
                  title="Previous response"
                >
                  ←
                </button>
                <span className="response-counter">
                  {responseIndex + 1}/{totalResponses}
                </span>
                <button
                  className="response-nav-button"
                  onClick={() => handleResponseChange('next')}
                  disabled={responseIndex === totalResponses - 1}
                  title="Next response"
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

ChatMessage.propTypes = {
  role: PropTypes.oneOf(['user', 'assistant', 'system']).isRequired,
  content: PropTypes.string,
  index: PropTypes.number.isRequired,
  streamingIndex: PropTypes.number,
  lastModelUsed: PropTypes.string,
  onRate: PropTypes.func,
  onRerun: PropTypes.func,
  availableModels: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired
  })),
  responseIndex: PropTypes.number,
  totalResponses: PropTypes.number,
  onResponseChange: PropTypes.func
};

export default ChatMessage;