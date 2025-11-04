// Ethereum provider type declarations for MetaMask and other wallet extensions

interface EthereumProvider {
  request(args: { method: string; params?: any[] }): Promise<any>;
  on(event: string, handler: (...args: any[]) => void): void;
  removeListener(event: string, handler: (...args: any[]) => void): void;
  isMetaMask?: boolean;
  isConnected?: boolean;
  chainId?: string;
  selectedAddress?: string;
  providers?: EthereumProvider[]; // For Brave browser multiple providers
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};