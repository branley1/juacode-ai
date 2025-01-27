import React, { useState } from 'react';
import ChatMessage from '../ChatMessage/ChatMessage';
import InputArea from '../InputArea/InputArea';
import Sidebar from '../Sidebar/Sidebar';
import './ChatInterface.css'; 
import JuaCodeLogo from '../../assets/jua-code-logo.png';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen } from '@fortawesome/free-solid-svg-icons';

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [chatTitle, setChatTitle] = useState('New chat');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleFirstMessageSent = () => {
    setChatStarted(true);
  };

  const handleTitleChange = (event) => {
    setChatTitle(event.target.value);
  };

  const handleTitleEditClick = () => {
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    setIsEditingTitle(false);
    localStorage.setItem('juaCodeChatTitle', chatTitle);

    // ----- Placeholder for Backend Saving -----
    // if (chatId) { // Assuming you have a chatId if it's an existing chat
    //   // Send a request to your backend to update chat title for chatId
    //   fetch('/api/chats/' + chatId, {
    //     method: 'PUT', // or 'PATCH'
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ title: chatTitle })
    //   })
    //   .then(response => {
    //     if (!response.ok) {
    //       console.error('Error saving chat title to backend:', response.statusText);
    //     }
    //   })
    //   .catch(error => console.error('Error saving chat title to backend:', error));
    // }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="chat-container">
        <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <div className="chat-content-wrapper">
      {!chatStarted ? ( // Conditional rendering for landing page
        <div className="landing-page">
            <div className="landing-title-container">
                <img src={JuaCodeLogo} alt="JuaCode Logo" className="landing-logo" />
                <h2 className="chat-title landing-chat-title">JuaCode</h2>
            </div>
          <div className="welcome-message">
            What can I help with? 
          </div>
          <InputArea 
            setMessages={setMessages} 
            messages={messages} 
            onFirstMessageSent={handleFirstMessageSent}
            isLandingPage={true}
            /> 
        </div>
      ) : ( // Chat Messages View
        <div className="chat-messages-area">
            <button className="sidebar-toggle-button" onClick={toggleSidebar}>
            <i className="fas fa-bars"></i>
            </button>
            <div className="chat-header">
                {isEditingTitle? ( // Conditional rendering for edit mode title input
                <input
                type="text"
                className="chat-title-input"
                value={chatTitle}
                onChange={handleTitleChange}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleTitleSave();
                    }
                }}
                />
                ) : (
                    <div className="chat-title-display">
                        <h2 className="chat-title">{chatTitle}</h2>
                        <button className="edit-title-button" onClick={handleTitleEditClick}>
                        <FontAwesomeIcon icon={faPen} />
                        </button>
                    </div>
                )}
            </div>
          <div className="chat-messages">
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                role={message.role}
                content={message.content} 
                isLatestMessage={index === messages.length - 1}
                />
            ))}
          </div>
          <InputArea 
            setMessages={setMessages} 
            messages={messages} 
            isLandingPage={false}
            />
        </div>
      )}
    </div>
    </div>
  );
}

export default ChatInterface;