import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from '../ChatMessage/ChatMessage';
import InputArea from '../InputArea/InputArea';
import Sidebar from '../Sidebar/Sidebar';
import './ChatInterface.css'; 
import JuaCodeLogo from '../../assets/jua-code-logo.png';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faBars, faPlus } from '@fortawesome/free-solid-svg-icons';

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [chatTitle, setChatTitle] = useState('Test chat');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const chatMessagesRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);

  const handleFirstMessageSent = () => {
    setChatStarted(true);
  };

  const handleTitleChange = (event) => {
    setChatTitle(event.target.value);
  };

  const handleTitleEditClick = () => {
    setIsEditingTitle(true);
  };

  useEffect(() => {
    if (chatMessagesRef.current) {
      const { scrollHeight, clientHeight } = chatMessagesRef.current;
      const shouldScroll = scrollHeight - clientHeight - chatMessagesRef.current.scrollTop < 100;
      if (shouldScroll) {
        chatMessagesRef.current.scrollTop = scrollHeight;
      }
    }
  }, [messages, isTyping]);

  // Simulate typing effect properly
  const simulateResponse = (input) => {
    setIsTyping(true);
    const response = `You said: ${input}`;
    let i = 0;
    
    const typingInterval = setInterval(() => {
      if (i < response.length) {
        setMessages(prev => {
          const newMessages = [...prev];
          if (!newMessages[newMessages.length - 1]?.content) {
            newMessages.push({ role: 'assistant', content: '' });
          }
          newMessages[newMessages.length - 1].content += response.charAt(i);
          return newMessages;
        });
        i++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
      }
    }, 20); // ms per character, smaller is better
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
      <div className="parent-container">
        <div className={`chat-content-wrapper ${isSidebarOpen ? 'sidebar-open' : ''}`}>
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
                chatMessagesRef={chatMessagesRef}
              /> 
            </div>
          ) : ( // Chat Messages View
            <div className="chat-messages-area">
              <button className="sidebar-toggle-button" onClick={toggleSidebar}>
                <FontAwesomeIcon icon={faBars} />
              </button>
              <div className="chat-header">
                 <div className="header-right-group">
                    <button className="new-chat-button" onClick={() => console.log('New chat')}>
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                  </div>
                  <div className="header-left-group">
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
                        }
                      }
                    />
                  ) : (
                      <div className="chat-title-display">
                          <h2 className="chat-title">{chatTitle}</h2>
                          <button className="edit-title-button" onClick={handleTitleEditClick}>
                            <FontAwesomeIcon icon={faPen} />
                          </button>
                        </div>
                      )
                    }
                  </div>
                </div>
              <div className="chat-messages" ref={chatMessagesRef}>
                {messages.map((message, index) => (
                  <ChatMessage
                    key={index}
                    role={message.role}
                    content={message.content} 
                    isLatestMessage={index === messages.length - 1}
                    chatMessagesRef={chatMessagesRef}
                  />
                ))}
              </div>
              <InputArea 
                setMessages={setMessages} 
                messages={messages} 
                isLandingPage={false}
                chatMessagesRef={chatMessagesRef}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;