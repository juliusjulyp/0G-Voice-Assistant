import React, { useState, useEffect } from 'react';
import { DashboardStats, PropsWithLoading, NetworkStatusResponse } from '../../types';
import { SkeletonStats } from '../ui/SkeletonLoader';
import LoadingState from '../ui/LoadingState';
import VoiceAssistant from '../ui/VoiceAssistant';
import { apiService } from '../../services/api';

interface StatsCardsProps extends PropsWithLoading {
  stats: DashboardStats;
  error?: string | null | undefined;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading, error }) => {
  const [networkConnected, setNetworkConnected] = useState(false);
  const [networkLoading, setNetworkLoading] = useState(true);

  // Fetch actual network status from API
  useEffect(() => {
    const fetchNetworkStatus = async () => {
      try {
        setNetworkLoading(true);
        console.log('🔍 StatsCards: Fetching network status...');
        const result = await apiService.getNetworkInfo() as NetworkStatusResponse;
        console.log('📡 StatsCards: API response:', result);
        console.log('🎯 StatsCards: success=', result.success, 'connected=', result.connected);
        
        const isConnected = result.success && result.connected === true;
        console.log('✅ StatsCards: Setting networkConnected to:', isConnected);
        setNetworkConnected(isConnected);
      } catch (error) {
        console.error('❌ StatsCards: Failed to fetch network status:', error);
        setNetworkConnected(false);
      } finally {
        setNetworkLoading(false);
      }
    };

    fetchNetworkStatus();
    
    // Poll network status every 15 seconds
    const interval = setInterval(fetchNetworkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleVoiceCommand = (command: string) => {
    console.log('Voice command received:', command);
    
    // Convert to lowercase for easier matching
    const cmd = command.toLowerCase().trim();
    
    // Basic voice commands
    if (cmd.includes('connect') && cmd.includes('network')) {
      console.log('Executing: Connect to network');
      // Trigger network connection
    } else if (cmd.includes('check') && cmd.includes('balance')) {
      console.log('Executing: Check balance');
      // Trigger balance check
    } else if (cmd.includes('upload') && cmd.includes('file')) {
      console.log('Executing: Upload file to storage');
      // Trigger file upload
    } else if (cmd.includes('deploy') && cmd.includes('contract')) {
      console.log('Executing: Deploy contract');
      // Trigger contract deployment
    } else if (cmd.includes('analyze') && cmd.includes('contract')) {
      console.log('Executing: Analyze contract');
      // Trigger contract analysis
    } else if (cmd.includes('help') || cmd.includes('what can you do')) {
      console.log('Showing available commands');
      // Show help/available commands
    } else {
      console.log('Command not recognized:', command);
      // Handle unrecognized commands
    }
  };

  return (
    <LoadingState
      loading={loading || false}
      error={error}
      skeleton={<SkeletonStats />}
      className="stats-grid"
    >
      <div className="stats-grid">
        <div className="stat-card tools-card">
          <div className="voice-section">
            <VoiceAssistant 
              onVoiceCommand={handleVoiceCommand}
              className="tools-voice-assistant"
            />
          </div>
          <div className="stat-icon">
            <i className="fas fa-tools"></i>
          </div>
          <div className="stat-content">
            <p className="stat-label">MCP Tools Available</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-network-wired"></i>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">
              <span className={`status-indicator ${networkConnected ? 'connected' : 'disconnected'}`}></span>
              {networkLoading ? 'Checking...' : (networkConnected ? 'Connected' : 'Disconnected')}
            </h3>
            <p className="stat-label">0G Galileo Testnet</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-brain"></i>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.aiConfidence}%</h3>
            <p className="stat-label">AI Learning Confidence</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-clock"></i>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.responseTime}</h3>
            <p className="stat-label">Average Response Time</p>
          </div>
        </div>
      </div>
    </LoadingState>
  );
};

export default StatsCards;