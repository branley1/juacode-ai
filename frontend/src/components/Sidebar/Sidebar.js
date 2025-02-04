import React, {useState} from 'react';
import './Sidebar.css';
import JuaCodeLogo from '../../assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faTrash, faEllipsisV } from '@fortawesome/free-solid-svg-icons';

function Sidebar({ isSidebarOpen, toggleSidebar, chatHistory, onChatSelect, onDeleteAllChats, onDeleteChat, onRenameChat }) {
  const [showAccountDetails, setShowAccountDetails] = useState(false);

  return (
    <React.Fragment>
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
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
              <li key={chat.id} className="chat-history-item">
                <div className="chat-history-item-content" onClick={() => onChatSelect(chat)}>
                  {chat.title}
                </div>
                <div className="chat-item-options">
                  <FontAwesomeIcon
                    icon={faEllipsisV}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Simple prompt-based options (replace with a proper dropdown in production)
                      const action = window.prompt('Enter "r" to rename or "d" to delete this chat:');
                      if (action === 'r') {
                        const newTitle = window.prompt('Enter new chat title:', chat.title);
                        if (newTitle) onRenameChat(chat.id, newTitle);
                      } else if (action === 'd') {
                        if (window.confirm('Are you sure you want to delete this chat?')) onDeleteChat(chat.id);
                      }
                    }}
                  />
                </div>
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
}

export default Sidebar;