import React from 'react';
import { ActivityItem } from '../../types';

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  // Default activities if none provided
  const defaultActivities: ActivityItem[] = [
    {
      id: '1',
      type: 'storage',
      text: 'File uploaded to 0G Storage',
      time: '2 minutes ago',
      icon: 'fas fa-upload'
    },
    {
      id: '2',
      type: 'contract-analysis',
      text: 'Contract analyzed: ERC20 Token',
      time: '5 minutes ago',
      icon: 'fas fa-cube'
    },
    {
      id: '3',
      type: 'ai',
      text: 'AI learning pattern updated',
      time: '8 minutes ago',
      icon: 'fas fa-brain'
    }
  ];

  const displayActivities = activities.length > 0 ? activities : defaultActivities;

  return (
    <div className="panel activity-feed">
      <h3 className="panel-title">
        <i className="fas fa-activity"></i>
        Recent Activity
      </h3>
      
      <div className="activity-list">
        {displayActivities.map((activity) => (
          <div key={activity.id} className="activity-item">
            <div className="activity-icon">
              <i className={activity.icon}></i>
            </div>
            <div className="activity-content">
              <p className="activity-text">{activity.text}</p>
              <span className="activity-time">{activity.time}</span>
            </div>
          </div>
        ))}
        
        {displayActivities.length === 0 && (
          <div className="no-activities">
            <i className="fas fa-info-circle"></i>
            <p>No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;