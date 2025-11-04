import React from 'react';
import { 
  Home, 
  Mic, 
  Settings, 
  Zap, 
  Network, 
  Database,
  Users,
  BarChart3,
  Menu,
  X,
  Code
} from 'lucide-react';
import '../styles/sidebar.css';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navigationItems = [
  { icon: Home, label: 'Dashboard', path: 'dashboard' },
  { icon: Mic, label: 'Voice Assistant', path: 'voice' },
  { icon: Zap, label: 'AI Compute', path: 'ai-compute' },
  { icon: Code, label: 'Developer Tools', path: 'developer-tools' },
  { icon: Network, label: 'Network', path: 'network' },
  { icon: Database, label: 'Storage', path: 'storage' },
  { icon: BarChart3, label: 'Analytics', path: 'analytics' },
  { icon: Users, label: 'Integrations', path: 'integrations' },
  { icon: Settings, label: 'Settings', path: 'settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, currentPage, onPageChange }) => {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo & Toggle */}
      <div className="sidebar-header">
        <div className="logo-section">
          {!collapsed && (
            <div className="logo">
              <div className="logo-icon">0G</div>
              <span className="logo-text">Voice Assistant</span>
            </div>
          )}
          <button className="toggle-btn" onClick={onToggle}>
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navigationItems.map((item) => (
            <li key={item.path}>
              <button 
                onClick={() => onPageChange(item.path)}
                className={`nav-item ${currentPage === item.path ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} className="nav-icon" />
                {!collapsed && <span className="nav-label">{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="sidebar-footer">
          <div className="status-indicator">
            <div className="status-dot online"></div>
            <span className="status-text">0G Network</span>
          </div>
        </div>
      )}
    </aside>
  );
};