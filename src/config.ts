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
  
  // KV Storage settings
  kvRpcUrl: process.env.KV_RPC_URL || 'http://3.101.147.150:6789',
  flowContractAddress: process.env.FLOW_CONTRACT_ADDRESS || '0x22E03a6A89B950F1c82ec5e74F8eCa321a105296',
  indexerRpcUrl: process.env.INDEXER_RPC_URL || 'https://indexer-storage-testnet-turbo.0g.ai',

  // Environment settings
  nodeEnv: process.env.NODE_ENV || 'development',
  debug: process.env.DEBUG === 'true'
} as const;

export type OGConfig = typeof OG_CONFIG;
