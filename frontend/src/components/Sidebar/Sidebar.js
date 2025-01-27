import React from 'react';
import './Sidebar.css';
import JuaCodeLogo from '../../assets/jua-code-logo.png';

function Sidebar({ isSidebarOpen, toggleSidebar }) {
  return (
    <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <img src={JuaCodeLogo} alt="JuaCode Logo" className="sidebar-logo" /> 
        <h3 className="sidebar-title">JuaCode</h3>
      </div>
      <div className="sidebar-content">
        {/* Content of sidebar will go here (Chat History, Saved Chats, etc.) */}
        <p>Sidebar Content Placeholder</p>
      </div>
    </div>
  );
}

export default Sidebar;