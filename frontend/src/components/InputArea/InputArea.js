import React, { useState } from 'react';
import SendIcon from '../../assets/send-black.svg';
import './InputArea.css';

function InputArea({ setMessages, messages, onFirstMessageSent, isLandingPage }) {
  const [input, setInput] = useState('');
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { role: 'user', content: input }]);

      if (!hasSentFirstMessage && onFirstMessageSent) { // Check if first message and callback exists
        onFirstMessageSent(); 
        setHasSentFirstMessage(true);
      }

      // Simulate assistant's response (example - modify for real backend later)
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'assistant', content: `You said: ${input}` },
      ]);

      setInput('');
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
        />
        <button onClick={handleSend} className="send-button">
        <img src={SendIcon} alt="Send" className="send-icon-img" />
        </button>
      </div>
    </div>
  );
}

export default InputArea;