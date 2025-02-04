import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from '../ChatMessage/ChatMessage';
import InputArea from '../InputArea/InputArea';
import Sidebar from '../Sidebar/Sidebar';
import './ChatInterface.css';
import JuaCodeLogo from '../../assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faBars, faPlus, faShare } from '@fortawesome/free-solid-svg-icons';

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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Helper function to save chat history to the backend
  const saveChatHistoryToBackend = async (chat) => {
    try {
      await fetch('/api/chats', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(chat)
      });
    } catch (error) {
      console.error('Error saving chat history to backend:', error);
    }
  };

  // Share chat handler copies a link based on current chat id.
  const handleShareChat = () => {
    const shareLink = `${window.location.origin}/chat/${currentChatId}`;
    navigator.clipboard.writeText(shareLink)
      .then(() => alert('Chat link copied!'))
      .catch(err => console.error('Error copying link:', err));
  };

  /*const handleFirstMessageSent = () => {
    console.log("ChatInterface.js: handleFirstMessageSent - Function called!");
    setChatStarted(true);
    // setMessages(prev => [...prev]);
  };*/

  const handleTitleChange = (event) => {
    setChatTitle(event.target.value);
  };

  const handleTitleEditClick = () => {
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    setIsEditingTitle(false);
    localStorage.setItem('juaCodeChatTitle', chatTitle);
    // Optionally, update the title on the backend:
    fetch('/api/chats/' + currentChatId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: chatTitle })
    }).catch(error => console.error('Error saving chat title to backend:', error));
  };

  const handleNewChat = () => {
    console.log('\n------handleNewChat called -------');

    if (messages.length > 0) { // Save current chat if there are messages
      const newChatRecord = { id: currentChatId, title: chatTitle, messages };
      setChatHistory(prevHistory => [...prevHistory, newChatRecord]);
      saveChatHistoryToBackend(newChatRecord);
    }
  
    // Determine a fresh title, 'New Chat' as base and add count if name already exists
    let baseTitle = 'New Chat';
    const count = chatHistory.filter(chat => chat.title.startsWith(baseTitle)).length;
    const newTitle = count > 0 ? `${baseTitle} ${count + 1}` : baseTitle;

    // Start a new chat
    const newChatId = Date.now();
    setCurrentChatId(newChatId);
    setMessages([]);
    setChatTitle(newTitle);
    setChatStarted(true);

    console.log('New chat started with ID:', newChatId, 'and title:', newTitle);
    console.log('------handleNewChat finished -------\n');
  };

  /*/ Update a chat’s title in sidebar
  const handleRenameChat = (chatId, newTitle) => {
    setChatHistory(prevHistory =>
      prevHistory.map(chat => (chat.id === chatId ? { ...chat, title: newTitle } : chat))
    );
  };*/

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

  useEffect(() => {
    if (!chatStarted) return; // Exit early if chat hasn't started
    if (!chatMessagesRef.current) {
      console.log('Chat messages container not found!');
      return;
    }
    requestAnimationFrame(() => {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    });
  }, [messages, chatStarted]);

  useEffect(() => {
    const handleKeyNavigation = (e) => {
      if (e.key === 'ArrowUp' && messages.length > 0) { // Implement message history navigation
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
      setIsTyping(true);
      const response = `You said: ${input}`;
      setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
          setIsTyping(false);
      }, 100);
    };
   /* 
  const simulateResponse = async (input) => {
    setIsTyping(true);
    try {
      // Example API call: adjust the URL and payload for deepseek-r1 or OpenAI API as needed
      const res = await fetch('/api/generate', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ prompt: input })
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      // Assume the API returns { response: "..." }
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Error fetching response:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, an error occurred.' }]);
    } finally {
      setIsTyping(false);
    }
  };*/

  /*const handleTitleSave = () => {
    setIsEditingTitle(false);
    localStorage.setItem('juaCodeChatTitle', chatTitle);
    
    fetch('/api/chats/' + currentChatId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: chatTitle })
    })
    .then(response => {
      if (!response.ok) {
        console.error('Error saving chat title to backend:', response.statusText);
      }
    })
    .catch(error => console.error('Error saving chat title to backend:', error));*/

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

  /* Delete all chats
  const handleDeleteAllChats = () => {
    console.log("handleDeleteAllChats called");
    setChatHistory([]);
    localStorage.removeItem('juaCodeChatHistory');
    setMessages([]);
    setChatTitle('New Chat');
    setChatStarted(false);
    setCurrentChatId(Date.now());
  };

  // Delete a single chat
  const handleDeleteChat = (chatIdToDelete) => {
    console.log("handleDeleteChat called for chatId:", chatIdToDelete);
    setChatHistory(prevHistory => {
      const updatedHistory = prevHistory.filter(chat => chat.id !== chatIdToDelete);
      return updatedHistory;
    });
  };*/

  return (
    <div className="chat-container">
      <Sidebar
      isSidebarOpen={isSidebarOpen}
      toggleSidebar={toggleSidebar}
      chatHistory={[...chatHistory].sort((a, b) => b.id - a.id)} // sort descending
      onChatSelect={handleChatSelect}
      onDeleteAllChats={() => {
        setChatHistory([]);
        localStorage.removeItem('juaCodeChatHistory');
        setMessages([]);
        setChatTitle('New Chat');
        setChatStarted(false);
        setCurrentChatId(Date.now());
      }}
      onDeleteChat={(chatId) => {
        setChatHistory(prevHistory => prevHistory.filter(chat => chat.id !== chatId));
      }}
      onRenameChat={(chatId, newTitle) => {
        setChatHistory(prevHistory =>
          prevHistory.map(chat => (chat.id === chatId ? { ...chat, title: newTitle } : chat))
        );
      }}
      />
      {isSidebarOpen && (
        <div className="sidebar-overlay active" onClick={toggleSidebar}></div>
      )}
      <div className="parent-container">
        <div className={`chat-content-wrapper ${isSidebarOpen ? 'sidebar-open' : ''}`}>
          {!chatStarted ? ( // Landing page
            <div className="landing-page">
              <button className="stb-lp" onClick={toggleSidebar}>
                <FontAwesomeIcon icon={faBars} />
              </button>
              <div className="landing-header">
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
                onFirstMessageSent={() => setChatStarted(true)}
                isLandingPage={true}
                chatMessagesRef={chatMessagesRef}
                simulateResponse={simulateResponse}
              />
            </div>
          ) : ( // Chat Messages View
            <div className="chat-messages-area">
              <div className="chat-header">
               <div className="header-left-group">
                <button className="sidebar-toggle-button" onClick={toggleSidebar}>
                  <FontAwesomeIcon icon={faBars} />
                </button>
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
                    </div>
                    )
                  }
                </div>
              </div>
              <div className="header-right-group">
                <button className="share-chat-button" onClick={handleShareChat}>
                  <FontAwesomeIcon icon={faShare} />
                </button>
                <button className="new-chat-button" onClick={handleNewChat}>
                  <FontAwesomeIcon icon={faPlus} />
                </button>
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
                  <div className="typing-indicator">
                    Assistant is typing...
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