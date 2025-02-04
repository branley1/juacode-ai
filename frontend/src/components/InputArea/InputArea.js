import React, { useState } from 'react';
import SendIcon from '../../assets/send-black.svg';
import './InputArea.css';

function InputArea({ setMessages, messages, onFirstMessageSent, isLandingPage, chatMessagesRef, simulateResponse }) {
  const [input, setInput] = useState('');
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { role: 'user', content: input }]);
      if (!hasSentFirstMessage && onFirstMessageSent) {
        console.log("InputArea.js: handleSend - Calling onFirstMessageSent()");
        onFirstMessageSent();
        setHasSentFirstMessage(true);
      }
      // Simulate assistant's response
      simulateResponse(input);
      setInput('');

      // Scroll to the bottom after sending the message
      setTimeout(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
      }, 0);
    }
  };

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
        <button
          onClick={handleSend}
          className="send-button"
        >
          <img src={SendIcon} alt="Send" className="send-icon-img" />
        </button>
      </div>
    </div>
  );
}

export default InputArea;