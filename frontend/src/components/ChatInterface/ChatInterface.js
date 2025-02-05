import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from '../ChatMessage/ChatMessage';
import InputArea from '../InputArea/InputArea';
import Sidebar from '../Sidebar/Sidebar';
import './ChatInterface.css';
import JuaCodeLogo from '../../assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faBars, faPlus, faShare } from '@fortawesome/free-solid-svg-icons';

// Generate a unique string for the chat id.
const generateUniqueChatId = () => {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

// Safely retrieve the unique id from a chat object.
const getChatId = (chat) => chat.chat_id || chat.id;

// Extract the creation timestamp from the id (assumes the id is in the "timestamp-random" format).
const extractTimestamp = (chat) => {
  const id = getChatId(chat);
  
  if (typeof id === 'number') {
    return id;
  } else if (typeof id === 'string') {
    // If the id follows the "timestamp-random" format, extract the timestamp.
    if (id.includes('-')) {
      const parts = id.split('-');
      const timestamp = parseInt(parts[0], 10);
      if (!isNaN(timestamp)) {
        return timestamp;
      }
    }
    // Fallback for legacy IDs: try to parse the entire id as a number.
    const fallbackTimestamp = parseInt(id, 10);
    if (!isNaN(fallbackTimestamp)) {
      return fallbackTimestamp;
    }
  }
  
  return 0;
};
function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [chatTitle, setChatTitle] = useState('Test chat');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(generateUniqueChatId());
  const chatMessagesRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [modelVariant, setModelVariant] = useState("normal");

  const [chatHistory, setChatHistory] = useState(() => { // Initialize chatHistory from localStorage
    const storedHistory = localStorage.getItem('juaCodeChatHistory');
    if (storedHistory) {
      try {
        let parsedHistory = JSON.parse(storedHistory);
        // Ensure every chat object has a chat_id property.
        parsedHistory = parsedHistory.map(chat => {
          if (!chat.chat_id && chat.id) {
            return { ...chat, chat_id: chat.id }; // convert previous id property
          } else if (!chat.chat_id) {
            return { ...chat, chat_id: generateUniqueChatId() }; // generate a new id if missing
          }
          return chat;
        });
        return parsedHistory;
      } catch (err) {
        console.error("Error parsing chat history from localStorage:", err);
        return [];
      }
    }
    return [];
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

    if (messages.length > 0) {
      const newChatRecord = { chat_id: currentChatId, title: chatTitle, messages };
      setChatHistory(prevHistory => {
        // Remove any existing entry with the same chat id (using safe accessor)
        const filtered = prevHistory.filter(chat => getChatId(chat) !== currentChatId);
        return [...filtered, newChatRecord];
      });
      saveChatHistoryToBackend(newChatRecord);
    }

    // Determine a fresh title, using "New Chat" as the base; add a count if one already exists.
    let baseTitle = 'New Chat';
    const count = chatHistory.filter(chat => chat.title.startsWith(baseTitle)).length;
    const newTitle = count > 0 ? `${baseTitle} ${count + 1}` : baseTitle;

    // Generate a new unique chat id
    const newChatId = generateUniqueChatId();
    setCurrentChatId(newChatId);
    setMessages([]);
    setChatTitle(newTitle);
    setChatStarted(true);

    console.log('New chat started with ID:', newChatId, 'and title:', newTitle);
    console.log('------handleNewChat finished -------\n');
  };

  useEffect(() => {
    console.log("ChatInterface.js: useEffect - Saving chatHistory to localStorage:", chatHistory);
    localStorage.setItem('juaCodeChatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const handleChatSelect = (selectedChat) => {
    console.log('handleChatSelect called with chat:', selectedChat);
    setChatTitle(selectedChat.title);
    setMessages(selectedChat.messages);
    setCurrentChatId(getChatId(selectedChat));
    setChatStarted(true);
    setIsSidebarOpen(false);
    setIsTyping(false);
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

  // Simulate typing effect with proper backend integration
  const simulateResponse = async (input) => {
    setIsTyping(true);
    try {
      const conversationHistory = [...messages, { role: 'user', content: input }];

      let requestBody = {
        prompt: input,
        messages: conversationHistory,
        model_variant: modelVariant
      };

      console.log('Sending request to:', '/api/generate');
      console.log('Request body:', requestBody);

      // Explicitly set the Content-Type header
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!res.ok) {
        console.error('Response status:', res.status);
        console.error('Response status text:', res.statusText);
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();

      if (modelVariant === "reasoner") {
        // When using the reasoning model, show both the chain-of-thought and the final answer.
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `Reasoning: ${data.reasoning}\n\nAnswer: ${data.content}` }
        ]);
      } else if (modelVariant === "json") {
        // For JSON output mode: format the JSON output for readability.
        const formattedJson = JSON.stringify(data, null, 2);
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: formattedJson }
        ]);
      } else {
        // Normal mode.
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.response }
        ]);
      }
    } catch (error) {
      console.error('Error fetching response:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, an error occurred.' }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="chat-container">
      <Sidebar
      isSidebarOpen={isSidebarOpen}
      toggleSidebar={toggleSidebar}
      chatHistory={[...chatHistory].sort((a, b) => extractTimestamp(b) - extractTimestamp(a))} // sort descending
      onChatSelect={handleChatSelect}
      onDeleteAllChats={() => {
        setChatHistory([]);
        localStorage.removeItem('juaCodeChatHistory');
        setMessages([]);
        setChatTitle('New Chat');
        setChatStarted(false);
        setCurrentChatId(null);
      }}
      onDeleteChat={(chatId) => {
        setChatHistory(prevHistory => prevHistory.filter(chat => getChatId(chat) !== chatId));
        if (currentChatId === chatId) {
          setChatStarted(false);
          setMessages([]);
          setChatTitle('');
        }
      }}
      onRenameChat={(chatId, newTitle) => {
        setChatHistory(prevHistory =>
          prevHistory.map(chat => (getChatId(chat) === chatId ? { ...chat, title: newTitle } : chat))
        );
        // Also update the backend with the new title
        fetch(`/api/chats/${chatId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle })
        }).catch(error => console.error('Error updating chat title in backend:', error));
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
                modelVariant={modelVariant}
                setModelVariant={setModelVariant}
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
                modelVariant={modelVariant}
                setModelVariant={setModelVariant}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;