import { ethers } from 'ethers';
import { OG_CONFIG } from './config.js';

export class OGNetworkClient {
  private provider: ethers.JsonRpcProvider;
  private network: ethers.Network | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(OG_CONFIG.rpcUrl);
  }

  async connect(): Promise<boolean> {
    try {
      console.log('Connecting to 0G network...');
      console.log('RPC URL:', OG_CONFIG.rpcUrl);
      
      const network = await this.provider.getNetwork();
      this.network = network;
      
      console.log('Connected to network:', {
        name: OG_CONFIG.networkName,
        chainId: network.chainId.toString(),
        expectedChainId: OG_CONFIG.chainId.toString()
      });

      // Verify we're on the correct network
      if (network.chainId !== BigInt(OG_CONFIG.chainId)) {
        throw new Error(`Wrong network! Expected ${OG_CONFIG.chainId}, got ${network.chainId}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to connect to 0G network:', error);
      return false;
    }
  }

  async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  async getNetworkInfo() {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      const gasPrice = await this.provider.getFeeData();
      
      return {
        blockNumber,
        gasPrice: gasPrice.gasPrice ? ethers.formatUnits(gasPrice.gasPrice, 'gwei') + ' gwei' : 'unknown',
        network: OG_CONFIG.networkName,
        chainId: OG_CONFIG.chainId
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      throw error;
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.provider.getBlockNumber();
      return true;
    } catch {
      return false;
    }
  }
}
