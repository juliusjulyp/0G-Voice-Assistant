import React from 'react';
import { Notification } from '../types';

interface NotificationContainerProps {
  notifications: Notification[];
  removeNotification: (id: string) => void;
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  removeNotification
}) => {
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'fas fa-check-circle';
      case 'error':
        return 'fas fa-exclamation-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      default:
        return 'fas fa-info-circle';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
        >
          <i className={getIcon(notification.type)}></i>
          <span>{notification.message}</span>
          <button onClick={() => removeNotification(notification.id)}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      ))}
      
    </div>
  );
};

export default NotificationContainer;