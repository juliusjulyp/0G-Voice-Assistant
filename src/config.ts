export const OG_CONFIG = {
  // 0G Galileo Testnet Configuration
  chainId: 16601,
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  storageRpcUrl: 'https://indexer-storage-testnet-turbo.0g.ai',
  explorerUrl: 'https://chainscan-galileo.0g.ai',
  faucetUrl: 'https://faucet.0g.ai',
  
  // Network settings
  networkName: '0G Galileo Testnet',
  nativeCurrency: {
    name: 'A0GI',
    symbol: 'A0GI',
    decimals: 18
  }
} as const;

export type OGConfig = typeof OG_CONFIG;
