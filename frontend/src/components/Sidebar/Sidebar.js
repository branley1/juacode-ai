import React from 'react';
import './Sidebar.css';
import JuaCodeLogo from '../../assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';

function Sidebar({ isSidebarOpen, toggleSidebar, chatHistory, onChatSelect }) {
  return (
    <React.Fragment>
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src={JuaCodeLogo} alt="JuaCode Logo" className="sidebar-logo" />
          <h3 className="sidebar-title">JuaCode</h3>
          <h4 className="sidebar-subtitle">AI Coding Assistant</h4>
        </div>

        <div className="sidebar-content">
          <h4 className="chat-history-title">Chat History</h4>
            <ul className='chat-history-list'>
            {chatHistory.map(chat => (  // Map dynamic data
              <li
                key={chat.id}
                className="chat-history-item"
                onClick={() => onChatSelect(chat)}
                >
                {chat.title}
              </li>
          ))}
        </ul>
      </div>

        <div className="sidebar-account">
          <div className="account-preview">
            <FontAwesomeIcon icon={faUserCircle} />
            <div className="account-details">
              <span className="account-name">Guest User</span>
              <small className="account-email">guest@example.com</small>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={toggleSidebar}
      ></div>
    </React.Fragment>
  );
}

export default Sidebar;