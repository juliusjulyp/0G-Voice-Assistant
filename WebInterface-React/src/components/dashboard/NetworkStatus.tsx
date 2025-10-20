import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import { NetworkInfo, NetworkStatusResponse } from '../../types';

interface NetworkStatusInfo extends NetworkInfo {
  connected: boolean;
  latency?: number;
}

const NetworkStatus: React.FC = () => {
  const [networkInfo, setNetworkInfo] = useState<NetworkStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchNetworkInfo();
    // Update every 15 seconds
    const interval = setInterval(fetchNetworkInfo, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchNetworkInfo = async () => {
    try {
      const startTime = Date.now();
      const result: NetworkStatusResponse = await apiService.getNetworkInfo();
      const latency = Date.now() - startTime;
      
      if (result.success && result.networkInfo) {
        const networkData = result.networkInfo;
        setNetworkInfo({
          blockNumber: networkData.blockNumber || 0,
          gasPrice: networkData.gasPrice || '0 gwei',
          network: networkData.network || '0G Galileo Testnet',
          chainId: networkData.chainId || 16602,
          connected: true,
          latency
        });
        setError(null);
      } else {
        setNetworkInfo(prev => prev ? { ...prev, connected: false } : null);
        setError('Network connection failed');
      }
      setLastUpdate(new Date());
    } catch (err) {
      setError('Failed to fetch network info');
      setNetworkInfo(prev => prev ? { ...prev, connected: false } : null);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !networkInfo) {
    return (
      <div className="network-status loading">
        <LoadingSpinner size="sm" text="Checking network..." />
      </div>
    );
  }

  const getConnectionStatus = () => {
    if (!networkInfo) return { status: 'disconnected', color: '#dc3545' };
    if (!networkInfo.connected) return { status: 'disconnected', color: '#dc3545' };
    if (networkInfo.latency && networkInfo.latency < 500) return { status: 'excellent', color: '#28a745' };
    if (networkInfo.latency && networkInfo.latency < 1000) return { status: 'good', color: '#ffc107' };
    return { status: 'slow', color: '#fd7e14' };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="network-status">
      <div className="network-header">
        <div className="network-title">
          <div 
            className="connection-indicator"
            style={{ backgroundColor: connectionStatus.color }}
          ></div>
          <h4>0G Network Status</h4>
        </div>
        <div className="last-update">
          Updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {error ? (
        <div className="network-error">
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
          <button onClick={fetchNetworkInfo} className="retry-btn">
            <i className="fas fa-redo"></i>
          </button>
        </div>
      ) : networkInfo ? (
        <div className="network-info-grid">
          <div className="network-stat">
            <div className="stat-icon">
              <i className="fas fa-cube"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">#{networkInfo.blockNumber.toLocaleString()}</div>
              <div className="stat-label">Latest Block</div>
            </div>
          </div>

          <div className="network-stat">
            <div className="stat-icon">
              <i className="fas fa-gas-pump"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{networkInfo.gasPrice}</div>
              <div className="stat-label">Gas Price</div>
            </div>
          </div>

          <div className="network-stat">
            <div className="stat-icon">
              <i className="fas fa-link"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">Chain {networkInfo.chainId}</div>
              <div className="stat-label">Network ID</div>
            </div>
          </div>

          {networkInfo.latency && (
            <div className="network-stat">
              <div className="stat-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{networkInfo.latency}ms</div>
                <div className="stat-label">Latency</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="no-network-info">
          <i className="fas fa-wifi"></i>
          <p>No network information available</p>
        </div>
      )}

      <div className="network-actions">
        <button 
          onClick={fetchNetworkInfo} 
          className="btn-refresh"
          disabled={loading}
        >
          <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i>
          Refresh
        </button>
      </div>
    </div>
  );
};

export default NetworkStatus;