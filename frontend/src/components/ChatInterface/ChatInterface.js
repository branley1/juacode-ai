import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatMessage from '../ChatMessage/ChatMessage';
import InputArea from '../InputArea/InputArea';
import Sidebar from '../Sidebar/Sidebar';
import './ChatInterface.css';
import JuaCodeLogo from '../../assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faBars, faPlus, faShare, faUser, faCog, faUserCircle, faSun, faMoon, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

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

function ChatInterface({ 
  setCurrentView, 
  onNavigateToLogin, 
  isUserAuthenticated, 
  userData, 
  onNavigateToProfile,
  onLogout
}) {
  const [messages, setMessages] = useState([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [chatTitle, setChatTitle] = useState('New Chat');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);
  const [currentChatId, setCurrentChatId] = useState(() => generateUniqueChatId());
  const chatMessagesRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [modelVariant, setModelVariant] = useState("normal");
  const [currentModel, setCurrentModel] = useState(AVAILABLE_MODELS[0].value);
  const [isChatPersisted, setIsChatPersisted] = useState(false);
  const [streamingIndex, setStreamingIndex] = useState(null);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const [currentLlmModel, setCurrentLlmModel] = useState(null);
  // State for theme
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('juaCodeTheme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('juaCodeTheme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('juaCodeTheme', 'light');
    }
  }, [isDarkMode]);

  // Light/Dark mode toggle
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setIsProfileMenuOpen(false);
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  // Effect to handle clicks outside the profile menu to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        const profileButton = document.querySelector('.profile-menu-button');
        if (profileButton && profileButton.contains(event.target)) {
          return;
        }
        setIsProfileMenuOpen(false);
      }
    }
    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuRef]);

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

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

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
        await fetch(`http://localhost:3000/api/chats/${currentChatId}`, {
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
          await fetch(`http://localhost:3000/api/chats/${currentChatId}`, {
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

    if (outgoingMessages.length > 0 && outgoingChatId && !outgoingIsPersisted) {
      const newChatToPersist = { 
        chat_id: outgoingChatId, 
        title: outgoingTitle, 
        messages: outgoingMessages,
        last_model_used: currentLlmModel
      };
      try {
        await fetch('http://localhost:3000/api/chats', {
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

    const newTitle = 'New Chat'; // Always start with 'New Chat'

    const newChatId = generateUniqueChatId();
    setCurrentChatId(newChatId);
    setMessages([]);
    setChatTitle(newTitle);
    setChatStarted(false); // Set to false to show landing view
    setIsChatPersisted(false);
    setStreamingIndex(null);
    setIsEditingTitle(false);
    setCurrentLlmModel(null);
    setIsProfileMenuOpen(false);

    // If not authenticated, redirect to login
    if (!isUserAuthenticated) {
      if (onNavigateToLogin) onNavigateToLogin(); else setCurrentView('login');
    }

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
    setIsChatPersisted(true);
    setStreamingIndex(null);
    setIsProfileMenuOpen(false);
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
      const response = await fetch(`http://localhost:3000/api/chats/${chatIdToSummarize}/summarize-title`, {
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
          const updateResponse = await fetch(`http://localhost:3000/api/chats/${chatIdToSummarize}`, {
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

  // Handle first user message
  const handleFirstMessage = () => {
    setChatStarted(true);
    // Ensure we keep same chat ID when changing models
    if (messages.length === 0) {
      console.log('Starting a new chat with ID:', currentChatId); // We're starting a truly new chat
    }
  };

  // Main message handling function
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
      const res = await fetch('http://localhost:3000/api/generate', {
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
      let buffer = ''; // Buffer for potentially incomplete SSE messages

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value, { stream: true });
        
        // Process buffer for complete SSE messages (data: {...}\n\n)
        buffer += chunk;
        
        let eventEndIndex;
        while ((eventEndIndex = buffer.indexOf('\n\n')) !== -1) {
          const eventStr = buffer.substring(0, eventEndIndex);
          buffer = buffer.substring(eventEndIndex + 2);

          if (eventStr.startsWith('data: ')) {
            const jsonStr = eventStr.substring(6).trim();
            if (jsonStr === '[DONE]') {
              done = true;
              break; 
            }
            try {
              const parsedEvent = JSON.parse(jsonStr);
              if (parsedEvent.model_used) {
                console.log("[ChatInterface] Received model_used:", parsedEvent.model_used);
                setCurrentLlmModel(parsedEvent.model_used);
              } else if (parsedEvent.text !== undefined) {
                if (!assistantMessagePlaceholderAdded && !done) {
                  setIsTyping(false);
                  setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
                  setStreamingIndex(messagesForAPI.length);
                  assistantMessagePlaceholderAdded = true;
                }
                assistantContentAccumulator += parsedEvent.text;
                if (currentChatId === localChatId && assistantMessagePlaceholderAdded) {
                  // eslint-disable-next-line no-loop-func
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].role === 'assistant') {
                      newMsgs[newMsgs.length - 1].content = assistantContentAccumulator;
                    }
                    return newMsgs;
                  });
                }
              }
            } catch (e) {
              console.warn("[ChatInterface] Error parsing SSE JSON or non-JSON data chunk:", jsonStr, e);
              // If it's not JSON, it might be an older format or an error. 
              // For backward compatibility or simple text streams, you might append directly:
              // assistantContentAccumulator += jsonStr; 
            }
          }
        }
        // If loop finishes, and there's remaining buffer content, it's an incomplete SSE.
        // Decide if/how to handle it. For now, we assume SSEs are complete.
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
          last_model_used: currentLlmModel,
        };
        console.log("Persisting new chat to backend (chatId, title, messages):", newChatPayload);
        try {
          const postRes = await fetch('http://localhost:3000/api/chats', {
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
          const updatePayload = { 
            messages: finalMessagesWithAssistantResponse, 
            title: localChatTitle,
            last_model_used: currentLlmModel,
          };
          const updateRes = await fetch(`http://localhost:3000/api/chats/${finalChatIdForSummary}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload),
          });
          
          if (!updateRes.ok) {
            // If update fails with 404, the chat doesn't exist in backend - try to persist it as new
            if (updateRes.status === 404) {
              console.log(`Chat ${finalChatIdForSummary} not found in backend, attempting to persist as new chat.`);
              
              const newChatPayloadIf404 = {
                chat_id: finalChatIdForSummary,
                title: localChatTitle,
                messages: finalMessagesWithAssistantResponse,
                last_model_used: currentLlmModel,
              };
              
              const postRes = await fetch('http://localhost:3000/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newChatPayloadIf404),
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

  // Effect to handle clicks outside the sidebar to close it
  useEffect(() => {
    function handleClickOutside(event) {
      const toggleButton = document.querySelector('.sidebar-toggle-button'); // General toggle
      const landingToggleButton = document.querySelector('.stb-lp'); // Landing page toggle

      if (sidebarRef.current && 
          !sidebarRef.current.contains(event.target) && 
          (toggleButton ? !toggleButton.contains(event.target) : true) &&
          (landingToggleButton ? !landingToggleButton.contains(event.target) : true)
         ) {
        if(isSidebarOpen) { // Only close if it's open
          toggleSidebar();
        }
      }
    }

    if (isSidebarOpen) { // Only add listener if sidebar is open
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSidebarOpen, sidebarRef, toggleSidebar]);

  return (
    <div className="chat-container">
      <Sidebar
        ref={sidebarRef}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        chatHistory={[...chatHistory].sort((a, b) => extractTimestamp(b) - extractTimestamp(a))}
        onChatSelect={handleChatSelect}
        onDeleteAllChats={() => {
          // Note: Backend deletion for all chats would be a separate API call
          setChatHistory([]);
          localStorage.removeItem('juaCodeChatHistory');
          setCurrentChatId(generateUniqueChatId());
          setMessages([]);
          setChatTitle('New Chat');
          setChatStarted(false); // Go to landing page
          setIsChatPersisted(false);
        }}
        onDeleteChat={async (chatIdToDelete) => {
          // Backend call to delete the chat
          try {
            await fetch(`http://localhost:3000/api/chats/${chatIdToDelete}`, { method: 'DELETE' }); // Assuming DELETE endpoint exists
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
            await fetch(`http://localhost:3000/api/chats/${chatIdToRename}`, {
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
        setCurrentView={setCurrentView}
        isUserAuthenticated={isUserAuthenticated}
        userData={userData}
        onNavigateToProfile={onNavigateToProfile}
      />
      {isSidebarOpen && (
        <div className="sidebar-overlay active" onClick={toggleSidebar}></div>
      )}
      <div className="parent-container">
        <div className={`chat-content-wrapper ${isSidebarOpen ? 'sidebar-open' : ''}`}>
          {!chatStarted ? (
            <div className="landing-page">
              <div className="initial-chat-header-icons">
                <button className="stb-lp" onClick={toggleSidebar}>
                  <FontAwesomeIcon icon={faBars} />
                </button>
                <div className="profile-menu-container-initial" ref={profileMenuRef}>
                    <button className="profile-menu-button" onClick={toggleProfileMenu} title="Profile and Settings">
                        <FontAwesomeIcon icon={faUser} />
                    </button>
                    {isProfileMenuOpen && (
                        <div className="profile-dropdown-menu">
                            <button onClick={() => {
                                if (isUserAuthenticated) {
                                    setCurrentView('profile');
                                } else {
                                    if (onNavigateToLogin) onNavigateToLogin(); else setCurrentView('login');
                                }
                                setIsProfileMenuOpen(false);
                            }} className="profile-dropdown-item">
                              <FontAwesomeIcon icon={faUserCircle} /> {isUserAuthenticated ? 'My Account' : 'Log In'}
                            </button>
                            
                            <button onClick={() => { toggleTheme(); setIsProfileMenuOpen(false); }} className="profile-dropdown-item">
                                <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} /> {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                            </button>

                            <button onClick={() => { alert('Settings clicked!'); setIsProfileMenuOpen(false);}} className="profile-dropdown-item">
                               <FontAwesomeIcon icon={faCog} /> Settings
                            </button>
                            
                            {isUserAuthenticated && (
                              <button onClick={() => { 
                                onLogout(); 
                                setIsProfileMenuOpen(false);
                              }} className="profile-dropdown-item">
                                <FontAwesomeIcon icon={faSignOutAlt} /> Logout
                              </button>
                            )}
                        </div>
                    )}
                </div>
              </div>
              <img 
                src={JuaCodeLogo} 
                alt="JuaCode Logo" 
                className="landing-logo" 
                style={{ display: 'block', margin: '20px auto', width: '100px', height: '100px' }} 
              />
              <h2 
                className="chat-title landing-chat-title" 
                style={{ textAlign: 'center', marginBottom: '30px' }} 
              >
                JuaCode
              </h2>
              <div className="welcome-message">
                What can I help with?
              </div>
              <InputArea
                setMessages={setMessages}
                messages={messages}
                onFirstMessageSent={handleFirstMessage}
                isLandingPage={true}
                chatMessagesRef={chatMessagesRef}
                simulateResponse={simulateResponse}
                modelVariant={modelVariant}
                setModelVariant={setModelVariant}
                isTyping={isTyping}
                currentModel={currentModel}
                setCurrentModel={setCurrentModel}
                availableModels={AVAILABLE_MODELS}
                isDarkMode={isDarkMode}
              />
            </div>
          ) : (
            <div className="chat-messages-area">
              <div className="chat-header">
                <div className="header-left-group">
                  <button className="sidebar-toggle-button" onClick={toggleSidebar}>
                    <FontAwesomeIcon icon={faBars} />
                  </button>
                  {isEditingTitle ? (
                    <input
                      type="text"
                      className="chat-title-input"
                      value={chatTitle}
                      onChange={handleTitleChange}
                      onBlur={handleTitleSave}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); }}
                      autoFocus
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
                <div className="header-right-group">
                  <button className="share-chat-button" onClick={handleShareChat} disabled={!isChatPersisted} title="Share Chat">
                    <FontAwesomeIcon icon={faShare} />
                  </button>
                  <button className="new-chat-button" onClick={handleNewChat} title="New Chat">
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                  <div style={{ position: 'relative' }} ref={profileMenuRef}>
                    <button className="profile-menu-button" onClick={toggleProfileMenu} title="Profile and Settings">
                      <FontAwesomeIcon icon={faUser} />
                    </button>
                    {isProfileMenuOpen && (
                      <div className="profile-dropdown-menu">
                        <button onClick={() => {
                            if (isUserAuthenticated) {
                                setCurrentView('profile');
                            } else {
                                if (onNavigateToLogin) onNavigateToLogin(); else setCurrentView('login');
                            }
                            setIsProfileMenuOpen(false);
                        }} className="profile-dropdown-item">
                          <FontAwesomeIcon icon={faUserCircle} /> {isUserAuthenticated ? 'My Account' : 'Log In'}
                        </button>
                        
                        <button onClick={() => { toggleTheme(); setIsProfileMenuOpen(false); }} className="profile-dropdown-item">
                            <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} /> {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                        </button>

                        <button onClick={() => { alert('Settings clicked!'); setIsProfileMenuOpen(false);}} className="profile-dropdown-item">
                           <FontAwesomeIcon icon={faCog} /> Settings
                        </button>
                        
                        {isUserAuthenticated && (
                          <button onClick={() => { 
                            onLogout(); 
                            setIsProfileMenuOpen(false);
                          }} className="profile-dropdown-item">
                            <FontAwesomeIcon icon={faSignOutAlt} /> Logout
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="chat-messages" ref={chatMessagesRef}>
                {messages.map((message, index) => (
                  <ChatMessage
                    key={index}
                    index={index}
                    role={message.role}
                    content={message.content}
                    streamingIndex={streamingIndex}
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
                setMessages={setMessages}
                messages={messages}
                onFirstMessageSent={handleFirstMessage}
                isLandingPage={false}
                chatMessagesRef={chatMessagesRef}
                simulateResponse={simulateResponse}
                modelVariant={modelVariant}
                setModelVariant={setModelVariant}
                isTyping={isTyping}
                currentModel={currentModel}
                setCurrentModel={setCurrentModel}
                availableModels={AVAILABLE_MODELS}
                isDarkMode={isDarkMode}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;