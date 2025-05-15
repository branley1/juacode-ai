import React, { useState, forwardRef } from 'react';
import './Sidebar.css';
import JuaCodeLogo from '../../assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faTrash, faEllipsisV } from '@fortawesome/free-solid-svg-icons';

// Safely retrieve the chat id from the chat object.
const getChatId = (chat) => chat.chat_id || chat.id || "";

// Wrap Sidebar with forwardRef
const Sidebar = forwardRef(({ isSidebarOpen, toggleSidebar, chatHistory, onChatSelect, onDeleteAllChats, onDeleteChat, onRenameChat }, ref) => {
  const [showAccountDetails, setShowAccountDetails] = useState(false);
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
          <img src={JuaCodeLogo} alt="JuaCode Logo" className="sidebar-logo" />
          <h3 className="sidebar-title">JuaCode</h3>
          <h4 className="sidebar-subtitle">AI Coding Assistant</h4>
        </div>
        <div className="sidebar-content">
          <div className="chat-history-header">
            <h4 className="chat-history-title">Chat History</h4>
            <button
              className="delete-all-chats-button"
              onClick={onDeleteAllChats}
              title="Delete All Chats"
            >
              <FontAwesomeIcon icon={faTrash} />
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
        <div className="sidebar-account">
          <div
            className="account-preview"
            onClick={() => setShowAccountDetails(prev => !prev)}
            style={{ cursor: 'pointer' }}
          >
            <FontAwesomeIcon icon={faUserCircle} />
            <div className="account-summary">
              <span className="account-name">Guest User</span>
            </div>
          </div>
          {showAccountDetails && (
            <div className="account-full-details">
              <p>Email: guest@example.com</p>
            </div>
          )}
        </div>
      </div>
    </React.Fragment>
  );
});

export default Sidebar;