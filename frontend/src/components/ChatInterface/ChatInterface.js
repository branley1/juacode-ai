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

const AVAILABLE_MODELS = [
  { value: "deepseek-chat", label: "DeepSeek V3" },
  { value: "o4-mini-2025-04-16", label: "o4-mini" },
  { value: "gemini-2.5-pro-preview-05-06", label: "Gemini 2.5 Pro" }
];

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [chatTitle, setChatTitle] = useState('New Chat');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(() => generateUniqueChatId());
  const chatMessagesRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [modelVariant, setModelVariant] = useState("normal");
  const [currentModel, setCurrentModel] = useState(AVAILABLE_MODELS[0].value);
  const [isChatPersisted, setIsChatPersisted] = useState(false);
  const [streamingIndex, setStreamingIndex] = useState(null);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);

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
    const outgoingChatId = currentChatId;
    const outgoingMessages = messages;
    const outgoingTitle = chatTitle;
    const outgoingIsPersisted = isChatPersisted;

    if (outgoingMessages.length > 0 && outgoingChatId) {
      if (outgoingIsPersisted) {
        const existingChatRecord = { chat_id: outgoingChatId, title: outgoingTitle, messages: outgoingMessages };
        try {
          await fetch(`/api/chats/${outgoingChatId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: outgoingTitle, messages: outgoingMessages }),
          });
          setChatHistory(prevHistory => {
            const filtered = prevHistory.filter(chat => getChatId(chat) !== outgoingChatId);
            return [...filtered, existingChatRecord];
          });
          console.log(`Updated existing chat ${outgoingChatId} on backend.`);
        } catch (error) {
          console.error(`Error updating existing chat ${outgoingChatId} on backend:`, error);
        }
      } else {
        const newChatToPersist = { chat_id: outgoingChatId, title: outgoingTitle, messages: outgoingMessages };
        try {
            await fetch('/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newChatToPersist),
            });
            setChatHistory(prevHistory => [...prevHistory, newChatToPersist]);
            console.log(`Persisted new chat ${outgoingChatId} on backend before creating another new chat.`);
        } catch (error) {
            console.error(`Error persisting new chat ${outgoingChatId} before creating another new chat:`, error);
        }
      }
    }

    const newTitle = 'New Chat'; // Always start with 'New Chat'

    const newChatId = generateUniqueChatId();
    setCurrentChatId(newChatId);
    setMessages([]);
    setChatTitle(newTitle);
    setChatStarted(true);
    setIsChatPersisted(false);
    setStreamingIndex(null);
    setIsEditingTitle(false);

    console.log('New empty chat initialized with ID:', newChatId, 'and title:', newTitle);
    console.log('------handleNewChat finished -------\n');
  };

  useEffect(() => {
    // This effect syncs chatHistory (local representation) to localStorage.
    // Backend persistence is handled by specific actions like simulateResponse and handleNewChat.
    if (chatHistory.length > 0 || localStorage.getItem('juaCodeChatHistory')) {
        localStorage.setItem('juaCodeChatHistory', JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // STEP 3: Modify handleChatSelect
  const handleChatSelect = (selectedChat) => {
    console.log('handleChatSelect called with chat:', selectedChat);
    const chatId = getChatId(selectedChat);
    if (!chatId) {
        console.error("Selected chat has no ID!", selectedChat);
        handleNewChat(); 
        return;
    }

    setChatTitle(selectedChat.title || "Chat");
    setMessages(selectedChat.messages || []);
    setCurrentChatId(chatId);
    setChatStarted(true);
    setIsSidebarOpen(false);
    setIsTyping(false);
    setIsChatPersisted(true); // Loaded chats are considered persisted
    setStreamingIndex(null);
  };

  useEffect(() => {
    const chatMessagesElement = chatMessagesRef.current;
    if (!chatStarted || !chatMessagesElement) {
      return;
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatMessagesElement;
      // If scrolled up by more than a small threshold, consider it a manual scroll
      if (scrollHeight - scrollTop - clientHeight > 50) { 
        setUserHasScrolledUp(true);
      } else {
        setUserHasScrolledUp(false);
      }
    };

    chatMessagesElement.addEventListener('scroll', handleScroll);

    if (!userHasScrolledUp) {
      requestAnimationFrame(() => {
        chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
      });
    }

    return () => {
      if (chatMessagesElement) { // Ensure element exists before removing listener
        chatMessagesElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [messages, chatStarted, streamingIndex, userHasScrolledUp, isTyping]);

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

  // New function to handle title summarization
  const summarizeAndSetChatTitle = async (chatIdToSummarize, messagesForSummary) => {
    if (!chatIdToSummarize || !messagesForSummary || messagesForSummary.length < 2) {
      console.log("Not enough information to summarize title for chat:", chatIdToSummarize);
      return;
    }

    console.log(`Requesting title summarization for chat ${chatIdToSummarize}`);
    try {
      const response = await fetch(`/api/chats/${chatIdToSummarize}/summarize-title`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The backend can fetch messages using chatId, or we can send them.
        // For now, let's assume backend fetches messages based on chatId to keep payload light.
        // body: JSON.stringify({ messages: messagesForSummary }) 
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Error summarizing title." }));
        console.error(`Error summarizing title for chat ${chatIdToSummarize}:`, errorData.detail);
        return;
      }

      const data = await response.json();
      const newTitle = data.title;

      if (newTitle) {
        console.log(`Chat ${chatIdToSummarize} title summarized to: "${newTitle}"`);
        // If the summarized chat is currently active, update its title in the main view
        if (currentChatId === chatIdToSummarize) {
          setChatTitle(newTitle);
        }
        // Update the title in the chat history
        setChatHistory(prevHistory =>
          prevHistory.map(chat =>
            getChatId(chat) === chatIdToSummarize ? { ...chat, title: newTitle } : chat
          )
        );

        // Directly PUT the new title to the backend upon successful summarization
        try {
          console.log(`Directly updating title on backend for ${chatIdToSummarize} after summarization.`);
          const updateResponse = await fetch(`/api/chats/${chatIdToSummarize}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle }),
          });
          if (!updateResponse.ok) {
            // Log if this specific update fails, but don't let it block UI updates already made
            const errorData = await updateResponse.json().catch(() => ({ detail: "Failed to PUT summarized title."}));
            console.error(`Error PUTting summarized title for chat ${chatIdToSummarize} to backend:`, errorData.detail);
          } else {
            console.log(`Successfully PUT summarized title for chat ${chatIdToSummarize} to backend.`);
          }
        } catch (putError) {
          console.error(`Exception during direct PUT of summarized title for ${chatIdToSummarize}:`, putError);
        }

      }
    } catch (error) {
      console.error(`Exception during title summarization for chat ${chatIdToSummarize}:`, error);
    }
  };

  const simulateResponse = async (input, selectedModelFromInputArea) => {
    const localChatId = currentChatId;
    let localIsChatPersisted = isChatPersisted;
    const localChatTitle = chatTitle;
    
    setIsTyping(true);
    
    const userMessage = { role: 'user', content: input };
    const messagesForAPI = [...messages, userMessage];

    setMessages(messagesForAPI);
    // Ensure view scrolls to user's new message and resets scroll state
    if (chatMessagesRef.current) {
      requestAnimationFrame(() => { // Use requestAnimationFrame for smoother scroll after DOM update
        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
      });
    }
    setUserHasScrolledUp(false); // User sending a message implies they want to be at the bottom
    
    let finalMessagesWithAssistantResponse = messagesForAPI; 
    let assistantMessagePlaceholderAdded = false; // Flag to track if placeholder is added

    try {
      const requestBody = {
        messages: messagesForAPI,
        model_variant: modelVariant,
        selected_model: selectedModelFromInputArea
      };

      console.log(`Sending request to /api/generate for chat ${localChatId} with body:`, requestBody);
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        console.error('Response status:', res.status, 'Text:', res.statusText);
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let assistantContentAccumulator = ''; 

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value, { stream: true });
        
        if (!assistantMessagePlaceholderAdded && !done) {
          setIsTyping(false);
          setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
          setStreamingIndex(messagesForAPI.length);
          assistantMessagePlaceholderAdded = true;
        }
        
        assistantContentAccumulator += chunk;
        const currentAccumulatedContentForThisIteration = assistantContentAccumulator;

        if (currentChatId === localChatId && assistantMessagePlaceholderAdded) {
          setMessages(prev => {
            const newMsgs = [...prev];
            if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].role === 'assistant') {
              newMsgs[newMsgs.length - 1].content = currentAccumulatedContentForThisIteration;
            }
            return newMsgs;
          });
        }
      }
      
      if (!assistantMessagePlaceholderAdded) {
          setIsTyping(false);
          setStreamingIndex(null);
      }

      try {
        const parsedData = JSON.parse(assistantContentAccumulator);
        if (parsedData && parsedData.response) {
          assistantContentAccumulator = parsedData.response;
        }
      } catch (e) { /* Not JSON or not expected structure, use as is */ }

      // Construct the final messages array including the complete assistant response
      finalMessagesWithAssistantResponse = [...messagesForAPI, { role: 'assistant', content: assistantContentAccumulator.trim() }];
      
      // Final update to messages state for this chat, if it's still active
      if (currentChatId === localChatId) {
        setMessages(finalMessagesWithAssistantResponse);
        if (assistantMessagePlaceholderAdded) setStreamingIndex(null);
      } else if (assistantMessagePlaceholderAdded) {
        setStreamingIndex(null);
      }

      // Persistence Logic (using captured local variables)
      let chatSuccessfullyPersistedOrUpdated = false;
      let finalChatIdForSummary = localChatId;

      if (!localIsChatPersisted && finalChatIdForSummary) {
        const newChatPayload = {
          chat_id: finalChatIdForSummary,
          title: localChatTitle,
          messages: finalMessagesWithAssistantResponse,
        };
        console.log("Persisting new chat to backend (chatId, title, messages):", newChatPayload);
        try {
          const postRes = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newChatPayload),
          });
          
          if (!postRes.ok) {
            console.error(`Error persisting new chat: ${postRes.status} ${postRes.statusText}`);
            throw new Error(`Backend POST error: ${postRes.status}`);
          }
          
          const postedChatResponse = await postRes.json();
          let authoritativeChatData = newChatPayload;

          if (postedChatResponse && postedChatResponse.chat) {
            authoritativeChatData = postedChatResponse.chat;
            const backendChatId = getChatId(postedChatResponse.chat);
            if (backendChatId && backendChatId !== finalChatIdForSummary) {
              console.log(`Chat ID changed by backend from ${finalChatIdForSummary} to ${backendChatId}`);
              finalChatIdForSummary = backendChatId;
            }
          }

          setChatHistory(prevHistory => {
              // Filter out any potential duplicates using both old and new ID if it changed
              const idsToRemove = new Set([localChatId, finalChatIdForSummary]);
              const newHistory = prevHistory.filter(c => !idsToRemove.has(getChatId(c)));
              return [...newHistory, authoritativeChatData];
          });
          
          if (currentChatId === localChatId || currentChatId === finalChatIdForSummary) { 
              if (finalChatIdForSummary !== currentChatId) {
                   setCurrentChatId(finalChatIdForSummary);
              }
              setIsChatPersisted(true);
              localIsChatPersisted = true;
          }
          console.log(`New chat (ID: ${finalChatIdForSummary}) persisted to backend successfully.`);
          chatSuccessfullyPersistedOrUpdated = true;
        } catch (error) {
          console.error(`Error persisting new chat ${finalChatIdForSummary}:`, error);
          // We'll continue with local state but won't try to update backend since persistence failed
          chatSuccessfullyPersistedOrUpdated = false;
        }
      } else if (localIsChatPersisted && finalChatIdForSummary) { 
        // This is an existing chat that needs to be updated
        try {
          console.log(`Updating messages for persisted chat ${finalChatIdForSummary} on backend.`);
          const updateRes = await fetch(`/api/chats/${finalChatIdForSummary}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: finalMessagesWithAssistantResponse, title: localChatTitle }),
          });
          
          if (!updateRes.ok) {
            // If update fails with 404, the chat doesn't exist in backend - try to persist it as new
            if (updateRes.status === 404) {
              console.log(`Chat ${finalChatIdForSummary} not found in backend, attempting to persist as new chat.`);
              
              const newChatPayload = {
                chat_id: finalChatIdForSummary,
                title: localChatTitle,
                messages: finalMessagesWithAssistantResponse,
              };
              
              const postRes = await fetch('/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newChatPayload),
              });
              
              if (!postRes.ok) {
                throw new Error(`Failed to persist chat after 404: ${postRes.status}`);
              }
              
              console.log(`Successfully persisted chat ${finalChatIdForSummary} after 404 not found.`);
            } else {
              throw new Error(`Update failed with status: ${updateRes.status}`);
            }
          }
          
          setChatHistory(prevHistory =>
            prevHistory.map(chat =>
              getChatId(chat) === finalChatIdForSummary ? { ...chat, messages: finalMessagesWithAssistantResponse, title: localChatTitle } : chat
            )
          );
          console.log(`Messages for chat ${finalChatIdForSummary} updated on backend.`);
          chatSuccessfullyPersistedOrUpdated = true;
        } catch (error) {
          console.error(`Error updating chat ${finalChatIdForSummary}:`, error);
          // Update local state but mark as unsuccessful for backend
          setChatHistory(prevHistory =>
            prevHistory.map(chat =>
              getChatId(chat) === finalChatIdForSummary ? { ...chat, messages: finalMessagesWithAssistantResponse, title: localChatTitle } : chat
            )
          );
          chatSuccessfullyPersistedOrUpdated = false;
        }
      }

      // New title summarization logic
      if (chatSuccessfullyPersistedOrUpdated) {
        const currentMessages = finalMessagesWithAssistantResponse;
        let messagesForSummary = null;
        let reasonForSummary = "";
        let requiresSummarization = false;

        if (currentMessages.length > 10) {
          // For chats longer than 10 messages, always try to refine the title with the latest 6 messages.
          messagesForSummary = currentMessages.slice(-6);
          reasonForSummary = "Refining title with latest 6 messages.";
          requiresSummarization = true;
        } else if (localChatTitle === 'New Chat' && currentMessages.length >= 6) {
          // For chats with 6 to 10 messages, summarize if title is still "New Chat".
          // Use all current messages for this initial summary as context might be building up.
          messagesForSummary = currentMessages; 
          reasonForSummary = "Initial title summarization for 'New Chat'.";
          requiresSummarization = true;
        }

        if (requiresSummarization && messagesForSummary) {
          console.log(`Attempting title summarization for chat ${finalChatIdForSummary}: ${reasonForSummary} (${messagesForSummary.length} messages).`);
          setTimeout(async () => {
            await summarizeAndSetChatTitle(finalChatIdForSummary, messagesForSummary);
          }, 250);
        }
      }

    } catch (error) {
      let userFacingErrorMessage;
      let detailedLogMessage;

      if (error.message && error.message.startsWith('Backend POST error')) {
        detailedLogMessage = `Error saving new chat ${localChatId}:`;
        userFacingErrorMessage = "Sorry, I couldn't save the chat.";
      } else {
        userFacingErrorMessage = "Sorry, I couldn't generate a response.";
        detailedLogMessage = `Error fetching AI response for chat ${localChatId}:`;
        if (localIsChatPersisted) {
          detailedLogMessage = `Error fetching AI response or updating existing chat ${localChatId}:`;
        } else {
          detailedLogMessage = `Error fetching AI response for new chat ${localChatId}:`;
        }
      }

      console.error(detailedLogMessage, error);

      if (currentChatId === localChatId) {
        setMessages([...messagesForAPI, { role: 'assistant', content: userFacingErrorMessage }]);
        setIsTyping(false); 
        setStreamingIndex(null);
      }
    } finally {
      if (isTyping) setIsTyping(false);
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
                currentModel={currentModel}
                setCurrentModel={setCurrentModel}
                availableModels={AVAILABLE_MODELS}
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
                  <div className="chat-message assistant assistant-typing">
                    <img src={JuaCodeLogo} alt="JuaCode Icon" className="profile-icon" />
                    <div className="message-area">
                      <div className="message-content">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                      </div>
                    </div>
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
                currentModel={currentModel}
                setCurrentModel={setCurrentModel}
                availableModels={AVAILABLE_MODELS}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;