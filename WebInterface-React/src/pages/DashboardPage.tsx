import React, { useEffect } from 'react';
import Navigation from '../components/Navigation';
import DashboardOverview from '../components/dashboard/DashboardOverview';
import ToolsSection from '../components/dashboard/ToolsSection';
import LiveAIInsights from '../components/dashboard/LiveAIInsights';
import ContractPlayground from '../components/dashboard/ContractPlayground';
import ContractIntelligence from '../components/dashboard/ContractIntelligence';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDashboardStore } from '../stores/dashboardStore';
import { apiService } from '../services/api';
import '../styles/ai-insights.css';
import '../styles/contract-playground.css';

interface DashboardPageProps {
  notificationHook: {
    addNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  };
}

const DashboardPage: React.FC<DashboardPageProps> = ({ notificationHook }) => {
  const { isConnected, activities, addActivity } = useWebSocket();
  const { updateStats } = useDashboardStore();

  useEffect(() => {
    // Load initial data
    const loadInitialData = async () => {
      try {
        const healthResult = await apiService.checkHealth();
        if (healthResult.success) {
          updateStats({
            networkStatus: {
              connected: true,
              chainId: '16602',
              blockNumber: 0,
              rpcUrl: 'https://0g-galileo-testnet.drpc.org'
            }
          });
          notificationHook.addNotification('Connected to 0G Voice Assistant API', 'success');
        }
      } catch (error) {
        notificationHook.addNotification('Failed to connect to API server', 'error');
      }
    };

    loadInitialData();
  }, [updateStats, notificationHook]);

  useEffect(() => {
    // Update connection status in store
    updateStats({
      networkStatus: {
        connected: isConnected,
        chainId: '16602',
        blockNumber: 0,
        rpcUrl: 'https://0g-galileo-testnet.drpc.org'
      }
    });
  }, [isConnected, updateStats]);

  return (
    <div className="dashboard-page">
      <Navigation isDashboard={true} />
      
      {/* Dashboard Overview Section */}
      <section id="dashboard-overview" className="dashboard">
        <div className="container">
          <h2 className="section-title">Live Dashboard</h2>
          <p className="section-subtitle">Real-time insights into your 0G Voice Assistant</p>
          
          <DashboardOverview 
            addActivity={addActivity}
            notificationHook={notificationHook}
          />
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools" className="tools">
        <div className="container">
          <h2 className="section-title">Developer Tools</h2>
          <p className="section-subtitle">Interactive tools powered by your 29 MCP tools</p>
          
          <ToolsSection 
            addActivity={addActivity}
            notificationHook={notificationHook}
          />
          
          {/* Contract Playground */}
          <div style={{ marginTop: '3rem' }}>
            <ContractPlayground />
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section id="analytics" className="analytics">
        <div className="container">
          <h2 className="section-title">Analytics & Insights</h2>
          <p className="section-subtitle">Real-time AI learning and performance metrics</p>
          
          <LiveAIInsights />
        </div>
      </section>

      {/* Contract Intelligence & Activity Section */}
      <section id="contract-activity" className="contract-activity">
        <div className="container">
          <h2 className="section-title">Contract Intelligence & Activity</h2>
          <p className="section-subtitle">Advanced contract analysis and recent system activity</p>
          
          <div className="contract-activity-grid">
            <div className="contract-intelligence-wrapper">
              <ContractIntelligence 
                addActivity={addActivity}
                notificationHook={notificationHook}
              />
            </div>
            <div className="activity-feed-wrapper">
              <ActivityFeed activities={activities} />
            </div>
          </div>
        </div>
      </section>

      {/* Settings Section */}
      <section id="settings" className="settings">
        <div className="container">
          <h2 className="section-title">Settings</h2>
          <p className="section-subtitle">Configure your 0G Voice Assistant</p>
          
          <div className="settings-grid">
            <div className="settings-card">
              <h3><i className="fas fa-cog"></i> General Settings</h3>
              <p>Basic configuration and preferences</p>
              <div className="coming-soon">Coming Soon</div>
            </div>
            <div className="settings-card">
              <h3><i className="fas fa-shield-alt"></i> Security Settings</h3>
              <p>Wallet management and security preferences</p>
              <div className="coming-soon">Coming Soon</div>
            </div>
            <div className="settings-card">
              <h3><i className="fas fa-microphone"></i> Voice Settings</h3>
              <p>Voice recognition and processing options</p>
              <div className="coming-soon">Coming Soon</div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default DashboardPage;