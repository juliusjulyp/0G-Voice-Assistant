import { io, Socket } from 'socket.io-client';
import { ActivityItem, DashboardStats, WebSocketMessage } from '../types';
import { env } from '../config/env';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

interface WebSocketEventHandlers {
  onConnectionChange?: (status: ConnectionStatus) => void;
  onActivity?: (activity: ActivityItem) => void;
  onStatsUpdate?: (stats: Partial<DashboardStats>) => void;
  onError?: (error: Error) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = env.WS_MAX_RECONNECT_ATTEMPTS;
  private reconnectInterval = env.WS_RECONNECT_INTERVAL;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private eventHandlers: WebSocketEventHandlers = {};
  private isManualDisconnect = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastPongReceived = Date.now();

  connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.socket?.connected) {
        resolve(true);
        return;
      }

      this.isManualDisconnect = false;
      this.setConnectionStatus('connecting');

      try {
        // Clear any existing socket
        if (this.socket) {
          this.socket.removeAllListeners();
          this.socket.disconnect();
        }

        this.socket = io(env.WS_URL, {
          timeout: 10000,
          forceNew: true,
          reconnection: false, // We handle reconnection manually
          transports: ['websocket', 'polling']
        });

        this.setupEventListeners(resolve);

      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        this.setConnectionStatus('error');
        this.eventHandlers.onError?.(error instanceof Error ? error : new Error(String(error)));
        resolve(false);
      }
    });
  }

  private setupEventListeners(resolve: (value: boolean) => void) {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to API server via WebSocket');
      this.reconnectAttempts = 0;
      this.setConnectionStatus('connected');
      this.startHeartbeat();
      resolve(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from API server:', reason);
      this.setConnectionStatus('disconnected');
      this.stopHeartbeat();
      
      if (!this.isManualDisconnect) {
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚫 WebSocket connection error:', error);
      this.setConnectionStatus('error');
      this.eventHandlers.onError?.(error);
      
      if (this.reconnectAttempts === 0) {
        resolve(false);
      }
      
      if (!this.isManualDisconnect) {
        this.handleReconnect();
      }
    });

    // Set up message handlers
    this.socket.on('activity', (activity: ActivityItem) => {
      this.eventHandlers.onActivity?.(activity);
    });

    this.socket.on('stats', (stats: Partial<DashboardStats>) => {
      this.eventHandlers.onStatsUpdate?.(stats);
    });

    // Heartbeat/ping-pong for connection health
    this.socket.on('pong', () => {
      this.lastPongReceived = Date.now();
    });

    // Handle custom message types
    this.socket.on('message', (message: WebSocketMessage) => {
      this.handleCustomMessage(message);
    });
  }

  private handleCustomMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'heartbeat':
        // Server heartbeat received
        break;
      case 'notification':
        // Handle server notifications
        console.log('Server notification:', message.payload);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private setConnectionStatus(status: ConnectionStatus) {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.eventHandlers.onConnectionChange?.(status);
    }
  }

  private handleReconnect() {
    if (this.isManualDisconnect) return;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.setConnectionStatus('reconnecting');
      
      const backoffDelay = Math.min(
        this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
        30000 // Max 30 seconds
      );
      
      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${backoffDelay}ms`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect().catch(console.error);
      }, backoffDelay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.setConnectionStatus('error');
      this.eventHandlers.onError?.(new Error('Max reconnection attempts reached'));
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
        
        // Check if we've received a pong recently
        const timeSinceLastPong = Date.now() - this.lastPongReceived;
        if (timeSinceLastPong > 30000) { // 30 seconds
          console.warn('⚠️ No pong received, connection may be stale');
          this.socket.disconnect();
        }
      }
    }, 15000); // Send ping every 15 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Public methods for event registration
  setEventHandlers(handlers: WebSocketEventHandlers) {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  onActivity(callback: (activity: ActivityItem) => void) {
    this.eventHandlers.onActivity = callback;
  }

  onStatsUpdate(callback: (stats: Partial<DashboardStats>) => void) {
    this.eventHandlers.onStatsUpdate = callback;
  }

  onConnectionStatus(callback: (status: ConnectionStatus) => void) {
    this.eventHandlers.onConnectionChange = callback;
  }

  onError(callback: (error: Error) => void) {
    this.eventHandlers.onError = callback;
  }

  // Send message to server
  send<T = unknown>(type: string, payload: T): boolean {
    if (this.socket?.connected) {
      this.socket.emit('message', {
        type,
        payload,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
      });
      return true;
    }
    return false;
  }

  // Disconnect manually
  disconnect() {
    this.isManualDisconnect = true;
    this.clearTimeouts();
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.setConnectionStatus('disconnected');
    this.reconnectAttempts = 0;
  }

  // Force reconnect
  reconnect(): Promise<boolean> {
    this.disconnect();
    this.isManualDisconnect = false;
    return this.connect();
  }

  // Get current connection status
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get connection health info
  getConnectionHealth() {
    return {
      connected: this.isConnected(),
      status: this.connectionStatus,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      lastPongReceived: this.lastPongReceived,
      timeSinceLastPong: Date.now() - this.lastPongReceived
    };
  }

  // Clear all timeouts
  private clearTimeouts() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // Remove specific event listeners
  off(event: string, callback?: (...args: unknown[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Cleanup method for component unmount
  cleanup() {
    this.clearTimeouts();
    this.stopHeartbeat();
    this.eventHandlers = {};
    this.disconnect();
  }
}

export const websocketService = new WebSocketService();