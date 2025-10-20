import React from 'react';
import { useDashboardStore } from '../../stores/dashboardStore';
import ToolCard from './ToolCard';
import { ActivityItem } from '../../types';

interface ToolsSectionProps {
  addActivity: (activity: Omit<ActivityItem, 'id'>) => void;
  notificationHook: {
    addNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  };
}

const ToolsSection: React.FC<ToolsSectionProps> = ({
  addActivity,
  notificationHook
}) => {
  const { mcpTools, activeToolsCategory, setActiveToolsCategory } = useDashboardStore();

  const categories = [
    { id: 'network', label: 'Network Operations', icon: 'fas fa-network-wired' },
    { id: 'storage', label: 'Storage Operations', icon: 'fas fa-database' },
    { id: 'ai', label: 'AI Learning', icon: 'fas fa-brain' },
    { id: 'contract', label: 'Contract Intelligence', icon: 'fas fa-cube' }
  ] as const;

  const filteredTools = mcpTools.filter(tool => tool.category === activeToolsCategory);

  return (
    <div className="tools-categories">
      {/* Tools Navigation */}
      <div className="tools-nav">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`tools-nav-btn ${activeToolsCategory === category.id ? 'active' : ''}`}
            onClick={() => setActiveToolsCategory(category.id)}
          >
            <i className={category.icon}></i>
            {category.label}
          </button>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="tools-grid">
        {filteredTools.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            addActivity={addActivity}
            notificationHook={notificationHook}
          />
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className="no-tools">
          <i className="fas fa-info-circle"></i>
          <p>No tools available for this category</p>
        </div>
      )}

    </div>
  );
};

export default ToolsSection;