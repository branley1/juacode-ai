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
    if (id.includes('-')) {
      const parts = id.split('-');
      const timestamp = parseInt(parts[0], 10);
      if (!isNaN(timestamp)) {
        return timestamp;
      }
    }
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
  const [chatTitle, setChatTitle] = useState('New Chat');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(() => generateUniqueChatId()); // Initialize with a new ID
  const chatMessagesRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [modelVariant, setModelVariant] = useState("normal");
  const [isChatPersisted, setIsChatPersisted] = useState(false);
  const [streamingIndex, setStreamingIndex] = useState(null);

  const [chatHistory, setChatHistory] = useState(() => {
    const storedHistory = localStorage.getItem('juaCodeChatHistory');
    if (storedHistory) {
      try {
        let parsedHistory = JSON.parse(storedHistory);
        parsedHistory = parsedHistory.map(chat => {
          if (!chat.chat_id && chat.id) {
            return { ...chat, chat_id: chat.id };
          } else if (!chat.chat_id) {
            return { ...chat, chat_id: generateUniqueChatId() };
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

  const handleTitleSave = async () => {
    setIsEditingTitle(false);

    // Only save to backend if the chat is persisted
    if (isChatPersisted && currentChatId) {
      try {
        await fetch(`/api/chats/${currentChatId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: chatTitle })
        });
        // Update chatHistory with the new title
        setChatHistory(prevHistory =>
          prevHistory.map(chat =>
            getChatId(chat) === currentChatId ? { ...chat, title: chatTitle } : chat
          )
        );
      } catch (error) {
        console.error('Error saving chat title to backend:', error);
      }
    } else {
      console.log("Title changed for a new (non-persisted) chat. Will be saved with first message.");
    }
  };
  
  useEffect(() => {
    // Only auto-save if the chat is persisted, not editing, and has a title/ID
    if (isChatPersisted && !isEditingTitle && chatTitle && currentChatId) {
      const timeoutId = setTimeout(async () => {
        try {
          await fetch(`/api/chats/${currentChatId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: chatTitle })
          });
          // Update chatHistory with the new title
           setChatHistory(prevHistory =>
            prevHistory.map(chat =>
              getChatId(chat) === currentChatId ? { ...chat, title: chatTitle } : chat
            )
          );
        } catch (error) {
          console.error('Error auto-saving chat title to backend:', error);
        }
      }, 1000); // 1-second debounce delay for auto-save
      return () => clearTimeout(timeoutId);
    }
  }, [chatTitle, isEditingTitle, currentChatId, isChatPersisted]);

  const handleNewChat = async () => {
    console.log('\n------handleNewChat called ------');

    // If there are messages in the current chat and it's persisted, save its final state (title and messages)
    if (messages.length > 0 && currentChatId && isChatPersisted) {
      const existingChatRecord = { chat_id: currentChatId, title: chatTitle, messages };
      try {
        await fetch(`/api/chats/${currentChatId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: chatTitle, messages: messages }), // Send title and messages
        });
        setChatHistory(prevHistory => {
          const filtered = prevHistory.filter(chat => getChatId(chat) !== currentChatId);
          return [...filtered, existingChatRecord];
        });
        console.log(`Updated existing chat ${currentChatId} on backend.`);
      } catch (error) {
        console.error(`Error updating existing chat ${currentChatId} on backend:`, error);
      }
    } else if (messages.length > 0 && currentChatId && !isChatPersisted) {
        // This is a new chat that had some interaction but wasn't persisted via simulateResponse yet.
        // Persist it now as the user is navigating away by creating a new chat.
        const newChatToPersist = { chat_id: currentChatId, title: chatTitle, messages };
        try {
            await fetch('/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newChatToPersist),
            });
            setChatHistory(prevHistory => [...prevHistory, newChatToPersist]);
            setIsChatPersisted(true); // Mark it as persisted
            console.log(`Persisted new chat ${currentChatId} on backend before creating another new chat.`);
        } catch (error) {
            console.error(`Error persisting new chat ${currentChatId} before creating another new chat:`, error);
        }
    }


    // Determine a fresh title for the truly new chat
    let baseTitle = 'New Chat';
    const count = chatHistory.filter(chat => chat.title && chat.title.startsWith(baseTitle)).length;
    const newTitle = count > 0 ? `${baseTitle} ${count + 1}` : baseTitle;

    const newChatId = generateUniqueChatId();
    setCurrentChatId(newChatId);
    setMessages([]);
    setChatTitle(newTitle);
    setChatStarted(true); // Keep chat started for the new empty interface
    setIsChatPersisted(false); // The new chat is not yet persisted
    setStreamingIndex(null);

    console.log('New empty chat initialized with ID:', newChatId, 'and title:', newTitle);
    console.log('------handleNewChat finished -------\n');
  };

  useEffect(() => {
    // This effect syncs chatHistory (local representation) to localStorage.
    // Backend persistence is handled by specific actions like simulateResponse and handleNewChat.
    if (chatHistory.length > 0 || localStorage.getItem('juaCodeChatHistory')) {
        console.log("ChatInterface.js: useEffect - Saving chatHistory to localStorage:", chatHistory);
        localStorage.setItem('juaCodeChatHistory', JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // STEP 3: Modify handleChatSelect
  const handleChatSelect = (selectedChat) => {
    console.log('handleChatSelect called with chat:', selectedChat);
    const chatId = getChatId(selectedChat);
    if (!chatId) {
        console.error("Selected chat has no ID!", selectedChat);
        // Potentially create a new chat or show an error
        handleNewChat(); 
        return;
    }
    setChatTitle(selectedChat.title || "Chat"); // Fallback title
    setMessages(selectedChat.messages || []);
    setCurrentChatId(chatId);
    setChatStarted(true);
    setIsSidebarOpen(false);
    setIsTyping(false);
    setIsChatPersisted(true); // Loaded chats are considered persisted
    setStreamingIndex(null);
  };

  useEffect(() => {
    if (!chatStarted || !chatMessagesRef.current) {
      // console.log('Scroll effect: chat not started or ref not available.');
      return;
    }

    const attemptScroll = () => {
      if (chatMessagesRef.current) {
        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        // console.log(`Scrolled for chat ${currentChatId}. ScrollTop: ${chatMessagesRef.current.scrollTop}, ScrollHeight: ${chatMessagesRef.current.scrollHeight}`);
      }
    };

    // Using setTimeout to ensure it runs after potential DOM updates from children
    // triggered by the 'messages' or 'currentChatId' change have settled.
    const timerId = setTimeout(() => {
      requestAnimationFrame(attemptScroll);
    }, 0); 

    return () => clearTimeout(timerId);
    
  }, [messages, chatStarted, currentChatId]); // Added currentChatId to dependencies

  useEffect(() => {
    const handleKeyNavigation = (e) => {
      if (e.key === 'ArrowUp' && messages.length > 0) {
        e.preventDefault();
      }
      if (e.ctrlKey && e.key === '/') {
        document.querySelector('.textarea')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyNavigation);
    return () => window.removeEventListener('keydown', handleKeyNavigation);
  }, [messages]);

  // STEP 4: Modify simulateResponse
  const simulateResponse = async (input) => {
    setIsTyping(true);
    setStreamingIndex(null);
    const userMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages); // Show user message immediately

    // Reference for the final state of messages after assistant responds
    let finalMessagesWithAssistantResponse = []; 

    try {
      const requestBody = {
        messages: updatedMessages, // Send the full history including the latest user message
        model_variant: modelVariant,
        // No need to send 'prompt' separately if 'messages' contains the full history
      };

      console.log('Sending request to /api/generate with body:', requestBody);
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        console.error('Response status:', res.status, 'Text:', res.statusText);
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      // Stream and display assistant's response
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let assistantContent = '';
      // Add a placeholder for the assistant's message for streaming
      const assistantMessageIndex = updatedMessages.length;
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      setStreamingIndex(assistantMessageIndex);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value, { stream: true }); // stream: true for proper multi-byte char handling
        assistantContent += chunk;
        setMessages(prev => {
          const newMsgs = [...prev];
          if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].role === 'assistant') {
            newMsgs[newMsgs.length - 1].content += chunk;
          }
          return newMsgs;
        });
      }
      
      // Finalize assistant's message content (parsing if it was JSON with a 'response' field)
      try {
        const parsedData = JSON.parse(assistantContent);
        if (parsedData && parsedData.response) {
          assistantContent = parsedData.response;
        }
      } catch (e) {
        // It wasn't JSON, or not the expected structure, use assistantContent as is
      }

      finalMessagesWithAssistantResponse = [...updatedMessages, { role: 'assistant', content: assistantContent.trim() }];
      setMessages(finalMessagesWithAssistantResponse);

      // --- Persistence Logic ---
      if (!isChatPersisted && currentChatId) {
        // This is the first exchange in a new chat, POST it to the backend
        const newChatPayload = {
          chat_id: currentChatId,
          title: chatTitle, // Use current chatTitle (could be "New Chat X" or user-set for new chat)
          messages: finalMessagesWithAssistantResponse,
        };
        console.log("Persisting new chat to backend:", newChatPayload);
        try {
          const postRes = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newChatPayload),
          });
          if (!postRes.ok) throw new Error(`Backend POST error: ${postRes.status}`);
          
          const postedChatResponse = await postRes.json();
          
          let authoritativeChatData = newChatPayload; // Fallback
          let authoritativeChatId = currentChatId;    // Fallback

          if (postedChatResponse && postedChatResponse.chat) {
            authoritativeChatData = postedChatResponse.chat;
            const backendChatId = getChatId(postedChatResponse.chat); // getChatId handles chat.chat_id or chat.id
            if (backendChatId) { // Ensure backendChatId is valid
              authoritativeChatId = backendChatId;
            }
          }

          // If the authoritative ID from backend is different from the one we sent, update currentChatId state
          if (authoritativeChatId !== currentChatId) {
            console.warn(`Chat ID updated: frontend sent ${currentChatId}, backend responded with/confirmed ${authoritativeChatId}. Updating currentChatId state.`);
            setCurrentChatId(authoritativeChatId);
          }

          // Update chat history using the authoritative data and ID
          setChatHistory(prevHistory => {
            // Filter out based on old currentChatId AND new authoritativeChatId to prevent duplicates if ID changed
            const filtered = prevHistory.filter(c => {
              const id = getChatId(c);
              return id !== currentChatId && id !== authoritativeChatId;
            });
            return [...filtered, authoritativeChatData];
          });
          
          setIsChatPersisted(true); // Mark as persisted (now associated with authoritativeChatId)
          console.log(`New chat (ID: ${authoritativeChatId}) persisted to backend successfully.`);
        } catch (error) {
          console.error("Error persisting new chat to backend:", error);
          // Decide if you want to revert setMessages or notify user
        }
      } else if (isChatPersisted && currentChatId) {
        // This is an existing, persisted chat. PUT the updated messages.
        console.log(`Updating messages for persisted chat ${currentChatId} on backend.`);
        try {
          const putRes = await fetch(`/api/chats/${currentChatId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: finalMessagesWithAssistantResponse }), // Only send messages for update
          });
          if (!putRes.ok) throw new Error(`Backend PUT error: ${putRes.status}`);
          // Update chatHistory
          setChatHistory(prevHistory =>
            prevHistory.map(chat =>
              getChatId(chat) === currentChatId ? { ...chat, messages: finalMessagesWithAssistantResponse, title: chatTitle } : chat
            )
          );
          console.log(`Messages for chat ${currentChatId} updated on backend.`);
        } catch (error) {
          console.error(`Error updating messages for chat ${currentChatId} on backend:`, error);
        }
      }

    } catch (error) {
      console.error("Error fetching response from /api/generate or during persistence:", error);
      // Revert to messages before adding the assistant's placeholder if streaming failed early
      setMessages(prev => prev.filter(msg => msg.role !== 'assistant' || msg.content !== '')); 
      // Add error message to UI
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't generate a response or save the chat." }]);
    } finally {
      setIsTyping(false);
      setStreamingIndex(null);
    }
  };

  return (
    <div className="chat-container">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        chatHistory={[...chatHistory].sort((a, b) => extractTimestamp(b) - extractTimestamp(a))}
        onChatSelect={handleChatSelect}
        onDeleteAllChats={() => {
          // Note: Backend deletion for all chats would be a separate API call
          setChatHistory([]);
          localStorage.removeItem('juaCodeChatHistory');
          // Reset current chat view
          setCurrentChatId(generateUniqueChatId());
          setMessages([]);
          setChatTitle('New Chat');
          setChatStarted(false); // Go to landing page
          setIsChatPersisted(false);
        }}
        onDeleteChat={async (chatIdToDelete) => {
          // Backend call to delete the chat
          try {
            await fetch(`/api/chats/${chatIdToDelete}`, { method: 'DELETE' }); // Assuming DELETE endpoint exists
            setChatHistory(prevHistory => prevHistory.filter(chat => getChatId(chat) !== chatIdToDelete));
            if (currentChatId === chatIdToDelete) {
              // If current chat is deleted, start a new one
              handleNewChat(); // This will set up a new, non-persisted chat
            }
            console.log(`Chat ${chatIdToDelete} deleted from backend and locally.`);
          } catch (error) {
             console.error(`Error deleting chat ${chatIdToDelete} from backend:`, error);
          }
        }}
        onRenameChat={async (chatIdToRename, newTitle) => {
          // Backend call to update title
          try {
            await fetch(`/api/chats/${chatIdToRename}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: newTitle })
            });
            setChatHistory(prevHistory =>
              prevHistory.map(chat => (getChatId(chat) === chatIdToRename ? { ...chat, title: newTitle } : chat))
            );
            if (currentChatId === chatIdToRename) {
              setChatTitle(newTitle); // Update current view if it's the renamed chat
            }
             console.log(`Chat ${chatIdToRename} renamed on backend and locally.`);
          } catch (error) {
             console.error(`Error renaming chat ${chatIdToRename} on backend:`, error);
          }
        }}
      />
      {isSidebarOpen && (
        <div className="sidebar-overlay active" onClick={toggleSidebar}></div>
      )}
      <div className="parent-container">
        <div className={`chat-content-wrapper ${isSidebarOpen ? 'sidebar-open' : ''}`}>
          {!chatStarted ? (
            <div className="landing-page">
              {/* ... landing page content ... */}
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
                setMessages={setMessages} // Direct setMessages might be okay for landing page if not persisted
                messages={messages}
                onFirstMessageSent={() => {
                    setChatStarted(true);
                    // Ensure currentChatId is fresh and isChatPersisted is false for the first "real" chat
                    setCurrentChatId(generateUniqueChatId());
                    setIsChatPersisted(false); 
                    setChatTitle("New Chat"); // Default title for the first chat
                }}
                isLandingPage={true}
                chatMessagesRef={chatMessagesRef}
                simulateResponse={simulateResponse}
                modelVariant={modelVariant}
                setModelVariant={setModelVariant}
                isTyping={isTyping}
              />
            </div>
          ) : (
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
                  onBlur={handleTitleSave} // handleTitleSave will now check isChatPersisted
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); }}
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
                 <div className="header-right-group">
                    <button className="share-chat-button" onClick={handleShareChat} disabled={!isChatPersisted}>
                        <FontAwesomeIcon icon={faShare} />
                    </button>
                    <button className="new-chat-button" onClick={handleNewChat}>
                        <FontAwesomeIcon icon={faPlus} />
                    </button>
                </div>
              </div>
              <div className="chat-messages" ref={chatMessagesRef}>
                  {messages.map((message, index) => (
                    <ChatMessage
                      key={index}
                      index={index}
                      role={message.role}
                      content={message.content}
                      streamingIndex={streamingIndex} // Pass streamingIndex instead of isLatestMessage
                      chatMessagesRef={chatMessagesRef}
                    />
                  ))}
                {isTyping && (
                  <div className="typing-indicator">
                    Assistant is typing...
                  </div>
                )}
              </div>
              <InputArea
                setMessages={setMessages} // This prop might be less relevant now if simulateResponse handles it
                messages={messages} // Pass for context, e.g. for up-arrow history in InputArea
                onFirstMessageSent={() => {
                    // This might not be needed if simulateResponse handles the first message.
                    // If kept, ensure it doesn't conflict with chat persistence logic.
                    setChatStarted(true); // This is fine
                }}
                isLandingPage={false}
                chatMessagesRef={chatMessagesRef}
                simulateResponse={simulateResponse}
                modelVariant={modelVariant}
                setModelVariant={setModelVariant}
                isTyping={isTyping}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;