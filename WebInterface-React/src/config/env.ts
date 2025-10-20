// Environment configuration with validation
interface EnvConfig {
  // API Configuration
  API_BASE_URL: string;
  API_TIMEOUT: number;

  // WebSocket Configuration
  WS_URL: string;
  WS_RECONNECT_INTERVAL: number;
  WS_MAX_RECONNECT_ATTEMPTS: number;

  // 0G Network Configuration
  NETWORK_NAME: string;
  CHAIN_ID: string;
  RPC_URL: string;
  EXPLORER_URL: string;
  FAUCET_URL: string;

  // Feature Flags
  ENABLE_DEBUG_MODE: boolean;
  ENABLE_ANALYTICS: boolean;
  ENABLE_ERROR_REPORTING: boolean;

  // Development Configuration
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  CACHE_DURATION: number;

  // Security
  ENABLE_CSRF_PROTECTION: boolean;
  MAX_FILE_SIZE: number;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is required but not defined`);
  }
  return value;
};

const getBooleanEnv = (key: string, defaultValue: boolean = false): boolean => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

const getNumberEnv = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required but not defined`);
    }
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
};

// Validate and create configuration
export const env: EnvConfig = {
  // API Configuration
  API_BASE_URL: getEnvVar('REACT_APP_API_BASE_URL', 'http://localhost:3001'),
  API_TIMEOUT: getNumberEnv('REACT_APP_API_TIMEOUT', 10000),

  // WebSocket Configuration
  WS_URL: getEnvVar('REACT_APP_WS_URL', 'ws://localhost:3001'),
  WS_RECONNECT_INTERVAL: getNumberEnv('REACT_APP_WS_RECONNECT_INTERVAL', 5000),
  WS_MAX_RECONNECT_ATTEMPTS: getNumberEnv('REACT_APP_WS_MAX_RECONNECT_ATTEMPTS', 10),

  // 0G Network Configuration
  NETWORK_NAME: getEnvVar('REACT_APP_NETWORK_NAME', '0G-Galileo-Testnet'),
  CHAIN_ID: getEnvVar('REACT_APP_CHAIN_ID', '16602'),
  RPC_URL: getEnvVar('REACT_APP_RPC_URL', 'https://evmrpc-testnet.0g.ai'),
  EXPLORER_URL: getEnvVar('REACT_APP_EXPLORER_URL', 'https://chainscan-galileo.0g.ai'),
  FAUCET_URL: getEnvVar('REACT_APP_FAUCET_URL', 'https://faucet.0g.ai'),

  // Feature Flags
  ENABLE_DEBUG_MODE: getBooleanEnv('REACT_APP_ENABLE_DEBUG_MODE', false),
  ENABLE_ANALYTICS: getBooleanEnv('REACT_APP_ENABLE_ANALYTICS', false),
  ENABLE_ERROR_REPORTING: getBooleanEnv('REACT_APP_ENABLE_ERROR_REPORTING', false),

  // Development Configuration
  LOG_LEVEL: (getEnvVar('REACT_APP_LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error'),
  CACHE_DURATION: getNumberEnv('REACT_APP_CACHE_DURATION', 300000),

  // Security
  ENABLE_CSRF_PROTECTION: getBooleanEnv('REACT_APP_ENABLE_CSRF_PROTECTION', true),
  MAX_FILE_SIZE: getNumberEnv('REACT_APP_MAX_FILE_SIZE', 10485760), // 10MB
};

// Validation
if (env.API_TIMEOUT < 1000 || env.API_TIMEOUT > 60000) {
  throw new Error('API_TIMEOUT must be between 1000 and 60000 milliseconds');
}

if (env.WS_RECONNECT_INTERVAL < 1000) {
  throw new Error('WS_RECONNECT_INTERVAL must be at least 1000 milliseconds');
}

if (env.WS_MAX_RECONNECT_ATTEMPTS < 1 || env.WS_MAX_RECONNECT_ATTEMPTS > 50) {
  throw new Error('WS_MAX_RECONNECT_ATTEMPTS must be between 1 and 50');
}

// Development-only exports
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';

export default env;