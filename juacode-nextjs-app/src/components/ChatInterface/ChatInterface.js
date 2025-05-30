"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import ChatMessage from '@/components/ChatMessage/ChatMessage';
import InputArea from '@/components/InputArea/InputArea';
import Sidebar from '@/components/Sidebar/Sidebar';
import './ChatInterface.css';
import JuaCodeLogo from '@/assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faBars, faPlus, faShare, faUser, faCog, faUserCircle, faSun, faMoon, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { fetchUserChats, createChat, updateChat, deleteChat, summarizeChatTitle, generateChatResponse, fetchCurrentUser } from '@/utils/api';
import { useTheme } from '@/context/ThemeContext';
import AvatarPlaceholder from '@/components/AvatarPlaceholder/AvatarPlaceholder';
import SettingsModal from '@/components/Settings/SettingsModal';

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
  { value: "deepseek-chat", label: "DeepSeek" },
  { value: "o4-mini-2025-04-16", label: "o4-mini" },
  { value: "gemini-2.5-pro-preview-05-06", label: "Gemini 2.5 Pro" }
];

function ChatInterface({ 
  onNavigateToLogin, 
  isUserAuthenticated, 
  onNavigateToProfile,
  onLogout
}) {
  const [messages, setMessages] = useState([]);
  const [messageResponses, setMessageResponses] = useState({}); // Track multiple responses per message
  const [currentResponseIndices, setCurrentResponseIndices] = useState({}); // Track which response is being shown
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
  const [currentLlmModel, setCurrentLlmModel] = useState('deepseek-chat');
  const [localUserData, setLocalUserData] = useState(null);
  
  // Use global theme context
  const { isDarkMode, toggleTheme } = useTheme();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const [chatHistory, setChatHistory] = useState([]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Abort controller for stopping streaming responses
  const [abortController, setAbortController] = useState(null);
  const handleStop = useCallback(() => {
    if (abortController) abortController.abort();
  }, [abortController]);

  // Effect to load user data from API or localStorage
  useEffect(() => {
    const loadUserData = async () => {
      if (isUserAuthenticated) {
        try {
          const apiUserData = await fetchCurrentUser();
          if (apiUserData) {
            setLocalUserData(apiUserData);
            localStorage.setItem('userData', JSON.stringify(apiUserData)); // Update localStorage
          } else {
            // Fallback to localStorage if API returns nothing or fails silently (though fetchCurrentUser should throw)
            const storedUserData = localStorage.getItem('userData');
            if (storedUserData) {
              setLocalUserData(JSON.parse(storedUserData));
            } else {
              setLocalUserData({ name: 'Guest User', email: 'guest@example.com' });
            }
          }
        } catch (error) {
          // If auth error (e.g., token expired), onLogout should be called by makeAuthenticatedRequest
          // For other errors, try localStorage
          const storedUserData = localStorage.getItem('userData');
          if (storedUserData) {
            setLocalUserData(JSON.parse(storedUserData));
          } else {
            // Potentially call onLogout() here if API fetch fails due to auth,
            // but makeAuthenticatedRequest should handle it.
             setLocalUserData({ name: 'Guest User', email: 'guest@example.com' });
          }
        }
      } else {
        setLocalUserData({ name: 'Guest User', email: 'guest@example.com' });
        // Optionally clear local storage for user data if not authenticated
        localStorage.removeItem('userData');
      }
    };

    loadUserData();
  }, [isUserAuthenticated, onLogout]);

  // Load user chats from backend
  const loadUserChats = useCallback(async () => {
    if (!isUserAuthenticated) {
      setChatHistory([]);
      return;
    }

    try {
      const userChats = await fetchUserChats();
      setChatHistory(Array.isArray(userChats) ? userChats : []);
      
      // Also update localStorage for offline access
      if (Array.isArray(userChats)) {
        localStorage.setItem('juaCodeChatHistory', JSON.stringify(userChats));
      } else {
        localStorage.removeItem('juaCodeChatHistory');
      }
    } catch (error) {
      // If authentication failed, handle logout
      if (error.message.includes('Authentication required')) {
        onLogout();
        return;
      }
      
      // Fallback to localStorage if backend fails
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
          setChatHistory(parsedHistory);
        } catch (err) {
          setChatHistory([]);
        }
      }
    }
  }, [isUserAuthenticated, onLogout]);

  // Load user chats when authentication status changes
  useEffect(() => {
    loadUserChats();
  }, [loadUserChats, isUserAuthenticated]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  const handleShareChat = () => {
    const shareLink = `${window.location.origin}/chat/${currentChatId}`;
    navigator.clipboard.writeText(shareLink)
      .then(() => alert('Chat link copied!'))
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
        await updateChat(currentChatId, { title: chatTitle });
        // Update chatHistory with the new title
        setChatHistory(prevHistory =>
          prevHistory.map(chat =>
            getChatId(chat) === currentChatId ? { ...chat, title: chatTitle } : chat
          )
        );
      } catch (error) {
        // If authentication failed, handle logout
        if (error.message.includes('Authentication required')) {
          onLogout();
        }
      }
    }
  };
  
  useEffect(() => {
    // Only auto-save if the chat is persisted, not editing, and has a title/ID
    if (isChatPersisted && !isEditingTitle && chatTitle && currentChatId) {
      const timeoutId = setTimeout(async () => {
        try {
          await updateChat(currentChatId, { title: chatTitle });
          // Update chatHistory with the new title
          setChatHistory(prevHistory =>
            prevHistory.map(chat =>
              getChatId(chat) === currentChatId ? { ...chat, title: chatTitle } : chat
            )
          );
        } catch (error) {
          // If authentication failed, handle logout
          if (error.message.includes('Authentication required')) {
            onLogout();
          }
        }
      }, 1000); // 1-second debounce delay for auto-save
      return () => clearTimeout(timeoutId);
    }
  }, [chatTitle, isEditingTitle, currentChatId, isChatPersisted, onLogout]);

  const handleNewChat = async () => {
    const outgoingChatId = currentChatId;
    const outgoingMessages = messages;
    const outgoingTitle = chatTitle;
    const outgoingIsPersisted = isChatPersisted;

    // Before creating a new chat, persist the current one if it's new and has messages
    if (outgoingMessages.length > 0 && outgoingChatId && !outgoingIsPersisted && isUserAuthenticated) {
      const newChatToPersist = {
        chat_id: outgoingChatId,
        title: outgoingTitle,
        messages: outgoingMessages,
        last_model_used: currentLlmModel
      };
      try {
        await createChat(newChatToPersist);
        setChatHistory(prevHistory => [...prevHistory, newChatToPersist]);
      } catch (error) {
        // If authentication failed, handle logout
        if (error.message.includes('Authentication required')) {
          onLogout();
          return; // Stop further execution in this function if not authenticated
        }
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
      if (onNavigateToLogin) onNavigateToLogin();
    }
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
    const chatId = getChatId(selectedChat);
    if (!chatId) {
      handleNewChat();
      return;
    }

    setChatTitle(selectedChat.title || "Chat");
    setMessages(selectedChat.messages || []);
    setCurrentChatId(chatId);
    setChatStarted(true);
    setIsSidebarOpen(false);
    setIsTyping(false);
    setIsChatPersisted(true); // Setting to true because it's from history
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

  // Keyboard navigation for messages
  useEffect(() => {
    const handleKeyNavigation = (event) => {
      if (!chatMessagesRef.current) return;

      const focusableElements = Array.from(
        chatMessagesRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      );
      const currentFocusIndex = focusableElements.indexOf(document.activeElement);

      if (event.key === 'ArrowUp' && messages.length > 0) {
        event.preventDefault();
        if (currentFocusIndex > 0) {
          focusableElements[currentFocusIndex - 1].focus();
        }
      } else if (event.key === 'ArrowDown' && messages.length > 0) {
        event.preventDefault();
        if (currentFocusIndex < focusableElements.length - 1) {
          focusableElements[currentFocusIndex + 1].focus();
        }
      } else if (event.ctrlKey && event.key === '/') {
        document.querySelector('.textarea')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyNavigation);
    return () => window.removeEventListener('keydown', handleKeyNavigation);
  }, [messages]);

  // New function to handle title summarization
  const summarizeAndSetChatTitle = async (chatIdToSummarize, messagesForSummary) => {
    if (!chatIdToSummarize || !messagesForSummary || messagesForSummary.length < 2) {
      return;
    }

    try {
      const data = await summarizeChatTitle(chatIdToSummarize);
      const newTitle = data.title;

      if (newTitle) {
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
      }
    } catch (error) {
      // If authentication failed, handle logout
      if (error.message.includes('Authentication required')) {
        onLogout();
      }
    }
  };

  const handleFirstMessage = () => {
    setChatStarted(true);
  };

  // Main message handling function
  const simulateResponse = async (input, selectedModelFromInputArea) => {
    // Initialize abort controller for this request
    const controller = new AbortController();
    setAbortController(controller);
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

      // Use the new generateChatResponse function from api.ts with abort signal
      const res = await generateChatResponse(requestBody, { signal: controller.signal });
      
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
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].role === 'assistant') {
                      newMsgs[newMsgs.length - 1].content = assistantContentAccumulator;
                    }
                    return newMsgs;
                  });
                }
              }
            } catch (parseError) {
              // If it's not JSON, it might be an older format or an error
            }
          }
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
          title: localChatTitle, // Should be "New Chat" or user-input if they edited it quickly
          messages: finalMessagesWithAssistantResponse,
          last_model_used: currentLlmModel, // Ensure this is set from the stream
        };
        try {
          const postedChatResponse = await createChat(newChatPayload);
          
          // IMPORTANT: Check if the chat creation was successful and we have valid chat data
          if (postedChatResponse && postedChatResponse.chat && postedChatResponse.chat.chat_id) {
            const authoritativeChatData = postedChatResponse.chat;
            const backendChatId = getChatId(authoritativeChatData);
            finalChatIdForSummary = backendChatId; // Use the ID from the backend

            setChatHistory(prevHistory => {
                // Filter out any potential duplicates using both old and new ID if it changed
                const idsToRemove = new Set([localChatId, finalChatIdForSummary]);
                const newHistory = prevHistory.filter(c => !idsToRemove.has(getChatId(c)));
                return [...newHistory, authoritativeChatData];
            });
            
            // Update current chat context only if this is still the active chat
            if (currentChatId === localChatId || currentChatId === finalChatIdForSummary) { 
                if (finalChatIdForSummary !== currentChatId) {
                     setCurrentChatId(finalChatIdForSummary);
                }
                // Only set as persisted if the API call was truly successful and we have a chat object
                setIsChatPersisted(true);
                localIsChatPersisted = true; // Update local flag for subsequent logic in this function call
            }
            chatSuccessfullyPersistedOrUpdated = true;
          } else {
            // Backend did not return a valid chat object
            chatSuccessfullyPersistedOrUpdated = false;
          }
        } catch (error) {
          if (error.message.includes('Authentication required')) {
            onLogout();
            return; // Stop further execution in this function
          }
          chatSuccessfullyPersistedOrUpdated = false;
        }
      } else if (localIsChatPersisted && finalChatIdForSummary) { 
        // This is an existing chat that needs to be updated
        try {
          const updatePayload = { 
            messages: finalMessagesWithAssistantResponse, 
            title: localChatTitle,
            last_model_used: currentLlmModel,
          };
          
          try {
            await updateChat(finalChatIdForSummary, updatePayload);
          } catch (updateError) {
            // If update fails with 404, the chat doesn't exist in backend - try to persist it as new
            if (updateError.message.includes('404')) {
              const newChatPayloadIf404 = {
                chat_id: finalChatIdForSummary,
                title: localChatTitle,
                messages: finalMessagesWithAssistantResponse,
                last_model_used: currentLlmModel,
              };
              
              await createChat(newChatPayloadIf404);
            } else {
              throw updateError;
            }
          }
          
          setChatHistory(prevHistory =>
            prevHistory.map(chat =>
              getChatId(chat) === finalChatIdForSummary ? { ...chat, messages: finalMessagesWithAssistantResponse, title: localChatTitle } : chat
            )
          );
          chatSuccessfullyPersistedOrUpdated = true;
        } catch (error) {
          // If authentication failed, handle logout
          if (error.message.includes('Authentication required')) {
            onLogout();
            return;
          }
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
        let requiresSummarization = false;

        if (currentMessages.length > 10) {
          // For chats longer than 10 messages, always try to refine the title with the latest 6 messages.
          messagesForSummary = currentMessages.slice(-6);
          requiresSummarization = true;
        } else if (localChatTitle === 'New Chat' && currentMessages.length >= 2) {
          // Initial title summarization for new chats with at least 2 messages
          messagesForSummary = currentMessages; 
          requiresSummarization = true;
        } else if (localChatTitle !== 'New Chat' && currentMessages.length >= 6 && currentMessages.length <= 10) {
          // For chats with 6-10 messages that already have a title, refine it periodically
          // Only refine every 6 messages to avoid too frequent updates
          if (currentMessages.length % 6 === 0) {
            messagesForSummary = currentMessages;
            requiresSummarization = true;
          }
        }

        if (requiresSummarization && messagesForSummary) {
          setTimeout(async () => {
            await summarizeAndSetChatTitle(finalChatIdForSummary, messagesForSummary);
          }, 250);
        }
      }

    } catch (error) {
      // Handle user-initiated abort
      if (error.name === 'AbortError') {
        setIsTyping(false);
        setStreamingIndex(null);
        // Remove any empty assistant placeholder
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant' && last.content === '') {
            return prev.slice(0, -1);
          }
          return prev;
        });
        return;
      }
      let userFacingErrorMessage;

      if (error.message && error.message.startsWith('Backend POST error')) {
        userFacingErrorMessage = "Sorry, I couldn't save the chat.";
      } else {
        userFacingErrorMessage = "Sorry, I couldn't generate a response.";
      }

      if (currentChatId === localChatId) {
        setMessages([...messagesForAPI, { role: 'assistant', content: userFacingErrorMessage }]);
        setIsTyping(false); 
        setStreamingIndex(null);
      }
    } finally {
      // Cleanup abort controller after request completes or errors
      setAbortController(null);
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

  const openSettings = () => {
    setIsProfileMenuOpen(false);
    setIsSettingsOpen(true);
  };

  const handleRateMessage = async (messageId, rating) => {
    try {
      await fetch(`/api/chats/${currentChatId}/messages/${messageId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ rating })
      });
    } catch (error) {
      // Handle error silently
    }
  };

  const handleRerunWithModel = async (messageId, newModel) => {
    try {
      const response = await fetch(`/api/chats/${currentChatId}/messages/${messageId}/rerun`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ model: newModel })
      });

      if (!response.ok) {
        throw new Error('Failed to rerun message');
      }

      const data = await response.json();
      
      // Update the message responses
      setMessageResponses(prev => {
        const currentResponses = prev[messageId] || [];
        return {
          ...prev,
          [messageId]: [...currentResponses, { content: data.content, model: newModel }]
        };
      });

      // Set the current response index to the new response
      setCurrentResponseIndices(prev => ({
        ...prev,
        [messageId]: (prev[messageId] || 0) + 1
      }));

      // Update the last model used
      setCurrentLlmModel(newModel);
    } catch (error) {
      // Handle error silently
    }
  };

  const handleResponseChange = (messageId, direction) => {
    setCurrentResponseIndices(prev => {
      const currentIndex = prev[messageId] || 0;
      const totalResponses = messageResponses[messageId]?.length || 1;
      
      if (direction === 'prev' && currentIndex > 0) {
        return { ...prev, [messageId]: currentIndex - 1 };
      } else if (direction === 'next' && currentIndex < totalResponses - 1) {
        return { ...prev, [messageId]: currentIndex + 1 };
      }
      return prev;
    });
  };

  return (
    <div className="chat-container">
      <Sidebar
        ref={sidebarRef}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        chatHistory={Array.isArray(chatHistory) ? [...chatHistory].sort((a, b) => extractTimestamp(b) - extractTimestamp(a)) : []}
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
            await deleteChat(chatIdToDelete);
            setChatHistory(prevHistory => prevHistory.filter(chat => getChatId(chat) !== chatIdToDelete));
            if (currentChatId === chatIdToDelete) {
              // If current chat is deleted, start a new one
              handleNewChat(); // This will set up a new, non-persisted chat
            }
          } catch (error) {
            // If authentication failed, handle logout
            if (error.message.includes('Authentication required')) {
              onLogout();
            }
          }
        }}
        onRenameChat={async (chatIdToRename, newTitle) => {
          // Backend call to update title
          try {
            await updateChat(chatIdToRename, { title: newTitle });
            setChatHistory(prevHistory =>
              prevHistory.map(chat => (getChatId(chat) === chatIdToRename ? { ...chat, title: newTitle } : chat))
            );
            if (currentChatId === chatIdToRename) {
              setChatTitle(newTitle); // Update current view if it's the renamed chat
            }
          } catch (error) {
            // If authentication failed, handle logout
            if (error.message.includes('Authentication required')) {
              onLogout();
            }
          }
        }}
        isUserAuthenticated={isUserAuthenticated}
        userData={localUserData}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToLogin={onNavigateToLogin}
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
                        <AvatarPlaceholder username={localUserData?.username ?? null} size={36} />
                    </button>
                    {isProfileMenuOpen && (
                        <div className="profile-dropdown-menu">
                            <button onClick={() => {
                                if (isUserAuthenticated) {
                                    if (onNavigateToProfile) onNavigateToProfile();
                                } else {
                                    if (onNavigateToLogin) onNavigateToLogin();
                                }
                                setIsProfileMenuOpen(false);
                            }} className="profile-dropdown-item">
                              <FontAwesomeIcon icon={faUserCircle} /> {isUserAuthenticated ? 'My Account' : 'Log In'}
                            </button>
                            
                            <button onClick={() => { toggleTheme(); setIsProfileMenuOpen(false); }} className="profile-dropdown-item">
                                <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} /> {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                            </button>

                            <button onClick={() => { openSettings(); }} className="profile-dropdown-item">
                               <FontAwesomeIcon icon={faCog} /> Settings
                            </button>
                            
                            {isUserAuthenticated && (
                              <button onClick={() => { 
                                if (onLogout) onLogout(); 
                                setIsProfileMenuOpen(false);
                              }} className="profile-dropdown-item">
                                <FontAwesomeIcon icon={faSignOutAlt} /> Logout
                              </button>
                            )}
                        </div>
                    )}
                </div>
              </div>
              <Image 
                src={JuaCodeLogo}
                priority
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
                isStreaming={streamingIndex !== null}
                onStop={handleStop}
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
                      <AvatarPlaceholder username={localUserData?.username ?? null} size={36} />
                    </button>
                    {isProfileMenuOpen && (
                      <div className="profile-dropdown-menu">
                        <button onClick={() => {
                            if (isUserAuthenticated) {
                                if (onNavigateToProfile) onNavigateToProfile();
                            } else {
                                if (onNavigateToLogin) onNavigateToLogin();
                            }
                            setIsProfileMenuOpen(false);
                        }} className="profile-dropdown-item">
                          <FontAwesomeIcon icon={faUserCircle} /> {isUserAuthenticated ? 'My Account' : 'Log In'}
                        </button>
                        
                        <button onClick={() => { toggleTheme(); setIsProfileMenuOpen(false); }} className="profile-dropdown-item">
                            <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} /> {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                        </button>

                        <button onClick={() => { openSettings(); }} className="profile-dropdown-item">
                           <FontAwesomeIcon icon={faCog} /> Settings
                        </button>
                        
                        {isUserAuthenticated && (
                          <button onClick={() => { 
                            if (onLogout) onLogout(); 
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
                {messages.map((message, index) => {
                  const messageId = message.id || index;
                  const responses = messageResponses[messageId] || [];
                  const currentResponseIndex = currentResponseIndices[messageId] || 0;
                  const totalResponses = responses.length + 1; // +1 for original response
                  
                  return (
                    <ChatMessage
                      key={messageId}
                      role={message.role}
                      content={currentResponseIndex === 0 ? message.content : responses[currentResponseIndex - 1].content}
                      index={index}
                      streamingIndex={streamingIndex}
                      lastModelUsed={currentResponseIndex === 0 ? currentLlmModel : responses[currentResponseIndex - 1].model}
                      onRate={(rating) => handleRateMessage(messageId, rating)}
                      onRerun={(model) => handleRerunWithModel(messageId, model)}
                      availableModels={AVAILABLE_MODELS}
                      responseIndex={currentResponseIndex}
                      totalResponses={totalResponses}
                      onResponseChange={(direction) => handleResponseChange(messageId, direction)}
                    />
                  );
                })}
                {isTyping && (
                  <div className="chat-message assistant assistant-typing">
                    <Image src={JuaCodeLogo} alt="JuaCode Icon" className="profile-icon" width={40} height={40} />
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
                isStreaming={streamingIndex !== null}
                onStop={handleStop}
              />
            </div>
          )}
        </div>
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

export default ChatInterface;