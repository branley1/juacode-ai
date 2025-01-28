import React from 'react';
import './Sidebar.css';
import JuaCodeLogo from '../../assets/jua-code-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';

function Sidebar({ isSidebarOpen, toggleSidebar }) {
  return (
    <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <img src={JuaCodeLogo} alt="JuaCode Logo" className="sidebar-logo" /> 
        <h3 className="sidebar-title">JuaCode</h3>
      </div>
      <div className="sidebar-content">
        <div className="sidebar-section">
          <h4>Chat History</h4>
          {/* Add dynamic chat history later */}
          <div className="chat-history-item">Previous Chat 1</div>
          <div className="chat-history-item">Previous Chat 2</div>
          {/* {chatHistory.map(chat => (  // Map dynamic data
          //   <div key={chat.id} className="chat-history-item">{chat.title}</div>
          // ))} */}
        </div>
      </div>
      <div className="sidebar-account">
        <div className="account-preview">
          <div className="account-icon">
            <FontAwesomeIcon icon={faUserCircle} />
          </div>
          <div className="account-info">
            <span className="account-name">Guest User</span>
            <small className="account-email">guest@example.com</small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;