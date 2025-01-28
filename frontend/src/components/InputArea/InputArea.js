import React, { useState } from 'react';
import SendIcon from '../../assets/send-black.svg';
import './InputArea.css';

function InputArea({ setMessages, messages, onFirstMessageSent, isLandingPage, chatMessagesRef }) {
  const [input, setInput] = useState('');
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { role: 'user', content: input }]);

      if (!hasSentFirstMessage && onFirstMessageSent) { // Check if first message and callback exists
        onFirstMessageSent(); 
        setHasSentFirstMessage(true);
      }

      if (chatMessagesRef.current) {
        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
      }

      // Simulate assistant's response (example - modify for real backend later)
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'assistant', content: generateAssistantResponse(input) },
      ]);

      setInput('');
    };

    const generateAssistantResponse = (userMessage) => {
      console.log("Placeholder: Calling backend for response to:", userMessage);
      return `Responding to: "${userMessage}" (Backend response will go here)`;
    };
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
          aria-label="Chat input" // Accessibility label for screen readers
          aria-multiline="true"
        />
        <button onClick={handleSend} className="send-button">
        <img src={SendIcon} alt="Send" className="send-icon-img" />
        </button>
      </div>
    </div>
  );
}

export default InputArea;