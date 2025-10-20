import React from 'react';
import { useDashboardStore } from '../../stores/dashboardStore';
import StatsCards from './StatsCards';
import QuickActions from './QuickActions';
import NetworkStatus from './NetworkStatus';
import { ActivityItem } from '../../types';

interface DashboardOverviewProps {
  addActivity: (activity: Omit<ActivityItem, 'id'>) => void;
  notificationHook: {
    addNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  };
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  addActivity,
  notificationHook
}) => {
  const { stats } = useDashboardStore();

  return (
    <div className="dashboard-overview">
      {/* Quick Stats Cards */}
      <StatsCards stats={stats} />

      {/* Network Status & Quick Actions Grid */}
      <div className="dashboard-actions-grid">
        <div className="network-status-wrapper">
          <NetworkStatus />
        </div>
        <div className="quick-actions-wrapper">
          <QuickActions 
            addActivity={addActivity}
            notificationHook={notificationHook}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;