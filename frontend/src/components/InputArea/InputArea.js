import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faToggleOn, faToggleOff, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import SendIcon from '../../assets/send-black.svg';
import './InputArea.css';

function InputArea({ setMessages, messages, onFirstMessageSent, isLandingPage, chatMessagesRef, simulateResponse, modelVariant, setModelVariant, isTyping, currentModel, setCurrentModel, availableModels }) {
  const [input, setInput] = useState('');
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const modelSelectorRef = useRef(null);

  const handleSend = () => {
    if (!input.trim() || isTyping) return;

    if (!hasSentFirstMessage && onFirstMessageSent) {
      console.log("InputArea.js: handleSend - Calling onFirstMessageSent()");
      onFirstMessageSent();
      setHasSentFirstMessage(true);
    }
    simulateResponse(input, currentModel);
    setInput('');
    setTimeout(() => {
      if (chatMessagesRef.current) {
        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
      }
    }, 0);
  };

  const handleModelSelect = (modelValue) => {
    setCurrentModel(modelValue);
    setIsModelSelectorOpen(false);
  };

  // Effect to handle clicks outside the model selector to close it
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
    <div className={`input-area ${isLandingPage ? 'landing-input-area' : 'input-area'}`}>
      <div className={`input-container ${isLandingPage ? 'landing-input-container' : 'input-container'}`}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          rows="4"
          name="input"
          className={isLandingPage ? 'landing-textarea' : 'textarea'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          aria-label="Chat input"
          aria-multiline="true"
        />
        <div className="controls-container">
          <button
            type="button"
            className="model-toggle-button"
            onClick={() => setModelVariant(prev => prev === "normal" ? "reasoner" : "normal")}
          >
            <FontAwesomeIcon icon={modelVariant === "normal" ? faToggleOff : faToggleOn} style={{ marginRight: '0.5rem' }} />
            <span>{ modelVariant === "normal" ? "Regular" : "Reasoning" }</span>
          </button>

          {/* Custom Model Selector */}
          <div className="custom-model-selector-container" ref={modelSelectorRef}>
            <div 
              className="custom-model-selector-display"
              onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
              aria-haspopup="listbox"
              aria-expanded={isModelSelectorOpen}
            >
              <span>{availableModels.find(m => m.value === currentModel)?.label || 'Select Model'}</span>
              <FontAwesomeIcon icon={isModelSelectorOpen ? faChevronUp : faChevronDown} />
            </div>
            {isModelSelectorOpen && (
              <div className="custom-model-selector-options" role="listbox">
                {availableModels.map(model => (
                  <div 
                    key={model.value} 
                    className={`custom-model-selector-option ${currentModel === model.value ? 'selected' : ''}`}
                    onClick={() => handleModelSelect(model.value)}
                    role="option"
                    aria-selected={currentModel === model.value}
                  >
                    {model.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleSend}
          disabled={isTyping}
          className="send-button"
        >
          <img src={SendIcon} alt="Send" className="send-icon-img" />
        </button>
      </div>
    </div>
  );
}

export default InputArea;