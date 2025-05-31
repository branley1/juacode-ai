import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faToggleOn, faToggleOff, faChevronDown, faChevronUp, faStop } from '@fortawesome/free-solid-svg-icons';
import SendIconWhite from '../../assets/send-white.svg';
import SendIconBlack from '../../assets/send-black.svg';
import { useTheme } from '@/context/ThemeContext';
import './InputArea.css';

function InputArea({ onFirstMessageSent, chatMessagesRef, simulateResponse, modelVariant, setModelVariant, isTyping, isStreaming, currentModel, setCurrentModel, availableModels, onStop }) {
  const { isDarkMode } = useTheme();
  const [input, setInput] = useState('');
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const modelSelectorRef = useRef(null);
  const textareaRef = useRef(null);
  const areaRef = useRef(null);
  const defaultAreaHeightRef = useRef(null);
  const sendIconSrc = isDarkMode ? SendIconWhite : SendIconBlack;

  useLayoutEffect(() => {
    if (!textareaRef.current || !areaRef.current) return;
    const ta = textareaRef.current;
    const area = areaRef.current;
    // Capture the default container height only once
    if (defaultAreaHeightRef.current == null) {
      defaultAreaHeightRef.current = area.clientHeight;
    }
    // Reset to default sizing when there's no input
    if (!input) {
      ta.style.height = '';
      area.style.height = '';
      return;
    }
    // Auto-resize textarea height, respecting CSS max-height
    ta.style.height = 'auto';
    const computed = window.getComputedStyle(ta);
    const maxHeight = parseFloat(computed.maxHeight) || Infinity;
    const newTaHeight = Math.min(ta.scrollHeight, maxHeight);
    ta.style.height = `${newTaHeight}px`;
    // Resize the container to at least its default height, growing with textarea
    const defH = defaultAreaHeightRef.current;
    const newAreaHeight = newTaHeight < defH ? defH : newTaHeight;
    area.style.height = `${newAreaHeight}px`;
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isTyping) return;

    if (!hasSentFirstMessage && onFirstMessageSent) {
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
    <div ref={areaRef} className="input-area">
      <div className="input-container">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          rows={1}
          name="input"
          className="textarea"
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
          {(isTyping || isStreaming) ? (
            <button type="button" onClick={onStop} className="stop-button" aria-label="Stop">
              <FontAwesomeIcon icon={faStop} size="lg" style={{ color: isDarkMode ? '#fff' : '#000' }} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={isTyping || isStreaming}
              className="send-button"
              aria-label="Send"
            >
              <Image src={sendIconSrc} alt="Send" className="send-icon-img" width={24} height={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default InputArea;