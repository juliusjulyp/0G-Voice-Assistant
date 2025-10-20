import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const OG_CONFIG = {
  // 0G Galileo Testnet Configuration
  chainId: parseInt(process.env.CHAIN_ID || '16602'),
  rpcUrl: process.env.RPC_URL || 'https://0g-galileo-testnet.drpc.org',
  storageRpcUrl: process.env.STORAGE_RPC_URL || 'https://indexer-storage-testnet-turbo.0g.ai',
  explorerUrl: 'https://chainscan-galileo.0g.ai',
  faucetUrl: 'https://faucet.0g.ai',
  
  // Network settings
  networkName: '0G-Galileo-Testnet',
  nativeCurrency: {
    name: 'OG',
    symbol: 'OG',
    decimals: 18
  },
  
  // Environment settings
  nodeEnv: process.env.NODE_ENV || 'development',
  debug: process.env.DEBUG === 'true'
} as const;

export type OGConfig = typeof OG_CONFIG;
