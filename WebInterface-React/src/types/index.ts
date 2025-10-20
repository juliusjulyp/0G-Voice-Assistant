// API Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
  requestId?: string;
}

// Base API Error
export interface ApiError {
  message: string;
  code?: string | number;
  details?: Record<string, unknown>;
}

// MCP Tool Types
export interface MCPTool {
  id: string;
  name: string;
  description: string;
  category: 'network' | 'storage' | 'ai' | 'contract';
  icon: string;
}

// Network Types
export interface NetworkStatus {
  connected: boolean;
  chainId: string;
  blockNumber: number;
  rpcUrl: string;
}

export interface NetworkInfo {
  blockNumber: number;
  gasPrice: string;
  network: string;
  chainId: number;
}

export interface NetworkStatusResponse {
  success: boolean;
  connected: boolean;
  networkInfo?: NetworkInfo;
  timestamp: string;
}

// Contract Analysis Types
export interface ContractAnalysis {
  address: string;
  contractType: string;
  functions: ContractFunction[];
  riskLevel: 'Low' | 'Medium' | 'High';
  toolsGenerated: number;
  analysisTime: string;
  bytecodeSize?: number;
  isVerified?: boolean;
  securityScore?: number;
}

export interface ContractFunction {
  name: string;
  type: 'function' | 'constructor' | 'fallback' | 'receive';
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
  inputs: ContractParameter[];
  outputs: ContractParameter[];
}

export interface ContractParameter {
  name: string;
  type: string;
  indexed?: boolean;
}

// Activity Types
export interface ActivityItem {
  id: string;
  type: 'storage' | 'contract-analysis' | 'ai' | 'network' | 'contract';
  text: string;
  time: string;
  icon: string;
}

// Dashboard Stats Types
export interface DashboardStats {
  toolsCount: number;
  aiConfidence: number;
  responseTime: string;
  networkStatus: NetworkStatus;
}

// Tool Execution Types
export interface ToolExecution {
  toolName: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  result?: any;
  error?: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

// Utility Types
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T = unknown, E = string> {
  status: AsyncStatus;
  data?: T;
  error?: E | undefined;
  lastUpdated?: number | undefined;
}

// Form Types
export interface FormField<T = string> {
  value: T;
  error?: string;
  touched: boolean;
  required?: boolean;
}

export interface ValidationRule<T = string> {
  test: (value: T) => boolean;
  message: string;
}

export interface ValidationResult<T> {
  isValid: boolean;
  errors: Partial<Record<keyof T, string>>;
  data: T;
}

// WebSocket Types
export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  id?: string;
}

// File Upload Types
export interface FileUploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

// Environment Types
export interface EnvironmentConfig {
  API_BASE_URL: string;
  WS_URL: string;
  NETWORK_NAME: string;
  CHAIN_ID: string;
  RPC_URL: string;
  ENABLE_DEBUG_MODE: boolean;
}

// Component Props Helpers
export type WithClassName<T = {}> = T & {
  className?: string;
};

export type WithChildren<T = {}> = T & {
  children?: React.ReactNode;
};

export type PropsWithLoading<T = {}> = T & {
  loading?: boolean;
  disabled?: boolean;
};