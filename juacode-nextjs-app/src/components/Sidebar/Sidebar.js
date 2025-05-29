import React, { useState, forwardRef } from 'react';
import Image from 'next/image';
import './Sidebar.css';
import JuaCodeLogo from '../../assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { icons } from '../../utils/icons.ts';
import { faEllipsisV, faTimes } from '@fortawesome/free-solid-svg-icons';

// Safely retrieve the chat id from the chat object.
const getChatId = (chat) => chat.chat_id || chat.id || "";

// Wrap Sidebar with forwardRef
const Sidebar = forwardRef(({
  isSidebarOpen, 
  toggleSidebar, 
  chatHistory, 
  onChatSelect, 
  onDeleteAllChats, 
  onDeleteChat, 
  onRenameChat, 
  isUserAuthenticated, 
  onNavigateToProfile, 
  onNavigateToLogin, 
  userData
}, ref) => {
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [openMenuChatId, setOpenMenuChatId] = useState(null);

  const handleRenameInitiate = (chat, e) => {
    e.stopPropagation();
    setEditingChatId(getChatId(chat));
    setEditingTitle(chat.title);
  };

  const handleRenameSave = (chatId) => {
    onRenameChat(chatId, editingTitle);
    setEditingChatId(null);
    setEditingTitle("");
  };

  return (
    <React.Fragment>
      {/* Pass the ref to the main div of the Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`} ref={ref}>
        <div className="sidebar-header">
          <Image src={JuaCodeLogo} alt="JuaCode Logo" className="sidebar-logo" width={40} height={40} />
          <h3 className="sidebar-title">JuaCode</h3>
          <h4 className="sidebar-subtitle">AI Coding Assistant</h4>
          <button onClick={toggleSidebar} className="sidebar-close-button" title="Close Sidebar">
            <FontAwesomeIcon icon={icons.faTimes} />
          </button>
        </div>
        <div className="sidebar-content">
          <div className="chat-history-header">
            <h4 className="chat-history-title">Chat History</h4>
            <button
              className="delete-all-chats-button"
              onClick={onDeleteAllChats}
              title="Delete All Chats"
            >
              <FontAwesomeIcon icon={icons.faTrash} />
            </button>
          </div>
          <ul className='chat-history-list'>
            {chatHistory.map(chat => (
              <li key={getChatId(chat)}
                className="chat-history-item"
                onClick={() => { onChatSelect(chat); setOpenMenuChatId(null); }}
                onContextMenu={(e) => { e.preventDefault(); setOpenMenuChatId(getChatId(chat)); }}
              >
                {editingChatId === getChatId(chat) ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => handleRenameSave(getChatId(chat))}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRenameSave(getChatId(chat)); }}
                    autoFocus
                    className="chat-rename-input"
                  />
                ) : (
                  <div className="chat-item-content">
                    {chat.title}
                  </div>
                )}
                <span className="menu-container">
                  <button 
                    className="menu-button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setOpenMenuChatId(prev => prev === getChatId(chat) ? null : getChatId(chat)); 
                    }}
                  >
                    <FontAwesomeIcon icon={faEllipsisV} />
                  </button>
                  {openMenuChatId === getChatId(chat) && (
                    <div className="chat-item-menu">
                      <button 
                        className="menu-item"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleRenameInitiate(chat, e); 
                          setOpenMenuChatId(null); 
                        }}
                      >
                        Rename
                      </button>
                      <button 
                        className="menu-item"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onDeleteChat(getChatId(chat)); 
                          setOpenMenuChatId(null); 
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="sidebar-account" onClick={() => {
          if (isUserAuthenticated && onNavigateToProfile) {
            onNavigateToProfile();
          } else if (!isUserAuthenticated && onNavigateToLogin) {
            onNavigateToLogin();
          }
          toggleSidebar();
        }}>
          <div className="account-preview">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <div className="account-details">
              <p>{userData?.username || 'Guest User'}</p>
              <small>{userData?.email || 'guest@example.com'}</small>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;