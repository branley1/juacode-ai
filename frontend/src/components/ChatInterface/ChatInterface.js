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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(Date.now());
  const chatMessagesRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);

  const [chatHistory, setChatHistory] = useState(() => { // Initialize chatHistory from localStorage
    const storedHistory = localStorage.getItem('juaCodeChatHistory');
    return storedHistory ? JSON.parse(storedHistory) : [];
  });

  const handleFirstMessageSent = () => {
    console.log("ChatInterface.js: handleFirstMessageSent - Function called!");
    console.log('Chat started!');
    setChatStarted(true);
  };

  const handleTitleChange = (event) => {
    setChatTitle(event.target.value);
  };

  const handleTitleEditClick = () => {
    setIsEditingTitle(true);
  };

  const handleNewChat = () => {
    console.log('handleNewChat called'); 
    console.log('Current chatTitle:', chatTitle); 
    console.log('Current messages:', messages);

    // Save the current chat to history BEFORE starting a new one
    setChatHistory(prevHistory => {
      const updatedHistory = [
      ...prevHistory,
      { id: currentChatId, title: chatTitle, messages }
    ];
    return updatedHistory;
    });

    // Start a new chat
    setMessages([]);
    setChatTitle('New Chat');
    setCurrentChatId(Date.now());
    setChatStarted(false);

    console.log('Intended new chat started - chatStarted: false (set in handleNewChat)');
    console.log('New chat started - chatTitle:', chatTitle);
    console.log('New chat started - messages:', messages);
  };

  useEffect(() => {
    console.log("ChatInterface.js: useEffect - Saving chatHistory to localStorage:", chatHistory);
    localStorage.setItem('juaCodeChatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const handleChatSelect = (selectedChat) => {
    console.log('handleChatSelect called with chat:', selectedChat);
    setChatTitle(selectedChat.title);
    setMessages(selectedChat.messages);
    setCurrentChatId(selectedChat.id);
    setChatStarted(true);
    setIsSidebarOpen(false);
  };

  useEffect(() => { // Autoscroll to bottom on new message
    if (!chatMessagesRef.current) {
      console.log('Chat messages container not found! Warning - This is normal when chat interface is not active.');
      return;
    } else {
      console.log('Scrolling to bottom of chat messages container');
      requestAnimationFrame(() => {
        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
      });
    }
  }, [messages]);

  useEffect(() => {
    const handleKeyNavigation = (e) => {
      if (e.key === 'ArrowUp' && messages.length > 0) {
        // Implement message history navigation
        e.preventDefault();
      }
      
      if (e.ctrlKey && e.key === '/') {
        document.querySelector('.textarea')?.focus();
      }
    };
  
    window.addEventListener('keydown', handleKeyNavigation);
    return () => window.removeEventListener('keydown', handleKeyNavigation);
  }, [messages]);

  // Simulate typing effect properly
  const simulateResponse = (input) => {
    setIsTyping(true); // Set isTyping to true before response simulation starts.
    const response = `You said: ${input}`;

    setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        setIsTyping(false); // Set isTyping to false after response simulation is complete.
    }, 20); // change to 20ms
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
      <Sidebar
      isSidebarOpen={isSidebarOpen}
      toggleSidebar={toggleSidebar}
      chatHistory={chatHistory}
      onChatSelect={handleChatSelect}
      />
      <div className="parent-container">
        <div className={`chat-content-wrapper ${isSidebarOpen ? 'sidebar-open' : ''}`}>
          {!chatStarted ? ( // Conditional rendering for landing page
            <div className="landing-page">
              <div className="landing-header">
                <button className="sidebar-toggle-button stb-lp" onClick={toggleSidebar}>
                  <FontAwesomeIcon icon={faBars} />
                </button>
              <div className="landing-title-container">
                <img src={JuaCodeLogo} alt="JuaCode Logo" className="landing-logo" />
                <h2 className="chat-title landing-chat-title">JuaCode</h2>
              </div>
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
                simulateResponse={simulateResponse}
              />
            </div>
          ) : ( // Chat Messages View
            <div className="chat-messages-area">
              <div className="chat-header" style={{ paddingLeft: '20px' }}>
              <div className="header-left-group">
                <button className="sidebar-toggle-button" onClick={toggleSidebar}>
                  <FontAwesomeIcon icon={faBars} />
                </button>
                </div>
                  {isEditingTitle? ( 
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
                      <button className="new-chat-button" onClick={handleNewChat}>
                        <FontAwesomeIcon icon={faPlus} />
                      </button>
                    </div>
                    )
                  }
                </div>
              <div className="chat-messages" ref={chatMessagesRef}>
                  {messages.map((message, index) => (
                    <ChatMessage
                      key={index}
                      index={index}
                      role={message.role}
                      content={message.content}
                      isLatestMessage={index === messages.length - 1}
                      chatMessagesRef={chatMessagesRef}
                    />
                  ))}
                {/* Typing indicator */}
                {isTyping && (
                     <div className="chat-message assistant-typing">
                        <div className="message-content">
                           <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                         </div>
                     </div>
                    )}
              </div>
              <InputArea
                setMessages={setMessages}
                messages={messages}
                isLandingPage={false}
                chatMessagesRef={chatMessagesRef}
                simulateResponse={simulateResponse}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;