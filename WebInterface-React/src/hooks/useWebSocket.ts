import { useEffect, useState, useCallback, useRef } from 'react';
import { websocketService, ConnectionStatus } from '../services/websocket';
import { ActivityItem, DashboardStats } from '../types';
import { useErrorHandler } from './useErrorHandler';

export const useWebSocket = (
  addNotification?: (message: string, type: 'error' | 'warning' | 'info' | 'success') => void
) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<Partial<DashboardStats>>({});
  const { handleError } = useErrorHandler(addNotification);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized event handlers
  const handleConnectionChange = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
    
    switch (status) {
      case 'connected':
        addNotification?.('Connected to 0G Voice Assistant', 'success');
        break;
      case 'disconnected':
        addNotification?.('Disconnected from server', 'warning');
        break;
      case 'reconnecting':
        addNotification?.('Reconnecting to server...', 'info');
        break;
      case 'error':
        addNotification?.('Connection error occurred', 'error');
        break;
    }
  }, [addNotification]);

  const handleActivity = useCallback((activity: ActivityItem) => {
    setActivities(prev => [activity, ...prev.slice(0, 9)]); // Keep latest 10
  }, []);

  const handleStatsUpdate = useCallback((newStats: Partial<DashboardStats>) => {
    setStats(prev => ({ ...prev, ...newStats }));
  }, []);

  const handleWebSocketError = useCallback((error: Error) => {
    handleError(error, {
      context: 'WebSocket Connection',
      showNotification: false // We handle notifications in handleConnectionChange
    });
  }, [handleError]);

  // Initialize WebSocket connection
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        // Set up event handlers before connecting
        websocketService.setEventHandlers({
          onConnectionChange: handleConnectionChange,
          onActivity: handleActivity,
          onStatsUpdate: handleStatsUpdate,
          onError: handleWebSocketError
        });

        const connected = await websocketService.connect();
        if (!connected && connectionStatus === 'disconnected') {
          // Only show error if we're not already in an error state
          addNotification?.('Failed to connect to server', 'error');
        }
      } catch (error) {
        handleError(error, {
          context: 'WebSocket Initialization',
          showNotification: true
        });
      }
    };

    initializeConnection();

    // Cleanup on unmount
    return () => {
      const timeoutId = reconnectTimeoutRef.current;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      websocketService.cleanup();
    };
  }, [handleConnectionChange, handleActivity, handleStatsUpdate, handleWebSocketError, connectionStatus, addNotification, handleError]);

  // Manual reconnect function
  const reconnect = useCallback(async () => {
    try {
      addNotification?.('Attempting to reconnect...', 'info');
      const connected = await websocketService.reconnect();
      if (!connected) {
        addNotification?.('Failed to reconnect to server', 'error');
      }
    } catch (error) {
      handleError(error, {
        context: 'Manual Reconnect',
        showNotification: true
      });
    }
  }, [addNotification, handleError]);

  // Add activity manually (for local activities)
  const addActivity = useCallback((activity: Omit<ActivityItem, 'id'>) => {
    const newActivity: ActivityItem = {
      ...activity,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
  }, []);

  // Send message to server
  const sendMessage = useCallback(<T = unknown>(type: string, payload: T): boolean => {
    return websocketService.send(type, payload);
  }, []);

  // Get connection health info
  const getConnectionHealth = useCallback(() => {
    return websocketService.getConnectionHealth();
  }, []);

  return {
    // Connection state
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    isReconnecting: connectionStatus === 'reconnecting',
    
    // Data
    activities,
    stats,
    
    // Actions
    addActivity,
    reconnect,
    sendMessage,
    getConnectionHealth
  };
};