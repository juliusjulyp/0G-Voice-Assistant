import React from 'react';
import { Search, Bell, User, Plus } from 'lucide-react';
import '../styles/header.css';

export const Header: React.FC = () => {
  return (
    <header className="app-header">
      <div className="header-content">
        {/* Search */}
        <div className="search-section">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search projects, commands, or ask AI..." 
              className="search-input"
            />
            <kbd className="search-kbd">⌘K</kbd>
          </div>
        </div>

        {/* Actions */}
        <div className="header-actions">
          <button className="btn btn-primary">
            <Plus size={16} />
            New Project
          </button>
          
          <div className="action-buttons">
            <div className="user-menu">
              <button className="user-btn">
                <div className="user-avatar">
                  <User size={16} />
                </div>
                <span className="user-name">User</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};