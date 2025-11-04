import { ethers } from 'ethers';
import { OG_CONFIG } from './config.js';

// 0G Galileo Testnet RPC endpoints with fallbacks
const RPC_ENDPOINTS = [
  OG_CONFIG.rpcUrl, // Primary RPC from config (supports QuickNode)
  'https://0g-galileo-testnet.drpc.org', // DRPC (fallback)
  'https://evmrpc-testnet.0g.ai', // Official 0G RPC (fallback)
];

export class OGNetworkClient {
  private provider: ethers.JsonRpcProvider;
  private network: ethers.Network;
  private wallet: ethers.Wallet | null = null;
  private currentRpcIndex = 0;

  constructor() {
    // Create network object for 0G Galileo Testnet
    this.network = new ethers.Network('0g-galileo-testnet', OG_CONFIG.chainId);
    
    // Creating provider with static network configuration and extended timeout
    this.provider = new ethers.JsonRpcProvider(
      RPC_ENDPOINTS[this.currentRpcIndex],
      this.network,
      { 
        staticNetwork: this.network
      }
    );
  }

  async connect(): Promise<boolean> {
    for (let attempt = 0; attempt < RPC_ENDPOINTS.length; attempt++) {
      try {
        const rpcUrl = RPC_ENDPOINTS[this.currentRpcIndex];
        console.log(`Connecting to 0G network (attempt ${attempt + 1}/${RPC_ENDPOINTS.length})...`);
        console.log('RPC URL:', rpcUrl);
        
        // Creating new provider for this endpoint with static network configuration
        this.provider = new ethers.JsonRpcProvider(
          rpcUrl,
          this.network,
          { 
            staticNetwork: this.network
          }
        );
        
        // Testing basic connectivity with a simple chainId 
        console.log('  └─ Testing chain ID...');
        const chainIdHex = await this.provider.send('eth_chainId', []);
        const chainId = parseInt(chainIdHex, 16);
        
        console.log('  📊 Network chainId:', chainId);
        console.log('  📊 Expected chainId:', OG_CONFIG.chainId);
        
        // Verify we're on the correct network
        if (chainId !== OG_CONFIG.chainId) {
          throw new Error(`Wrong network! Expected ${OG_CONFIG.chainId}, got ${chainId}`);
        }
        
        // Testing block number to ensure full connectivity
        console.log('  └─ Testing block number...');
        const blockNumber = await this.provider.getBlockNumber();
        console.log('  📦 Current block number:', blockNumber);
        
        console.log('✅ Successfully connected to network:', {
          name: OG_CONFIG.networkName,
          chainId: chainId.toString(),
          expectedChainId: OG_CONFIG.chainId.toString(),
          rpcUrl: rpcUrl,
          blockNumber: blockNumber
        });

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to connect to ${RPC_ENDPOINTS[this.currentRpcIndex]}:`, errorMessage);
        
        // Moving to next endpoint
        this.currentRpcIndex = (this.currentRpcIndex + 1) % RPC_ENDPOINTS.length;
        
        // If this was the last attempt, return false
        if (attempt === RPC_ENDPOINTS.length - 1) {
          console.error('🚨 All RPC endpoints failed. The 0G testnet appears to be experiencing widespread connectivity issues.');
          console.error('💡 Consider using a 3rd party RPC provider like QuickNode, ThirdWeb, or Ankr for more reliable access.');
          return false;
        }
        
        // Wait with exponential backoff before trying the next endpoint
        const delay = Math.min(2000 * Math.pow(2, attempt), 10000);
        console.log(`⏳ Trying next endpoint in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return false;
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

  // Wallet integration methods
  connectWallet(privateKey: string): void {
    try {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      console.log('Wallet connected:', this.wallet.address);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw new Error('Invalid private key');
    }
  }

  getWalletAddress(): string | null {
    return this.wallet?.address || null;
  }

  async sendTransaction(to: string, value: string): Promise<string> {
    if (!this.wallet) {
      throw new Error('No wallet connected. Use connectWallet() first.');
    }

    try {
      console.log(`Sending transaction: ${this.wallet.address} -> ${to}, Value: ${value} A0GI`);
      
      const tx = await this.wallet.sendTransaction({
        to,
        value: ethers.parseEther(value)
      });

      console.log('Transaction sent:', tx.hash);
      return tx.hash;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw error;
    }
  }

  async deployContract(bytecode: string, constructorArgs: any[] = []): Promise<string> {
    if (!this.wallet) {
      throw new Error('No wallet connected. Use connectWallet() first.');
    }

    try {
      console.log('Deploying contract with bytecode length:', bytecode.length);
      
      // Create contract factory
      //  we will need the ABI and proper contract interface 
      const factory = new ethers.ContractFactory([], bytecode, this.wallet);
      
      // Deploy contract
      const contract = await factory.deploy(...constructorArgs);
      
      console.log('Contract deployment initiated:', contract.target);
      console.log('Transaction hash:', contract.deploymentTransaction()?.hash);
      
      // Wait for deployment confirmation
      await contract.waitForDeployment();
      
      const contractAddress = await contract.getAddress();
      console.log('Contract deployed at:', contractAddress);
      
      return contractAddress;
    } catch (error) {
      console.error('Failed to deploy contract:', error);
      throw error;
    }
  }

  async getTransactionStatus(txHash: string): Promise<any> {
    try {
      const tx = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      return {
        hash: txHash,
        from: tx?.from,
        to: tx?.to,
        value: tx ? ethers.formatEther(tx.value) : '0',
        gasPrice: tx?.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : '0',
        gasUsed: receipt?.gasUsed.toString(),
        blockNumber: receipt?.blockNumber,
        status: receipt?.status === 1 ? 'success' : 'failed',
        confirmations: receipt ? await this.provider.getBlockNumber() - receipt.blockNumber + 1 : 0
      };
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      throw error;
    }
  }

  async estimateGas(to: string, value: string, data?: string): Promise<string> {
    try {
      const estimate = await this.provider.estimateGas({
        to,
        value: ethers.parseEther(value),
        data
      });
      
      return estimate.toString();
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      throw error;
    }
  }

  async getGasPrice(): Promise<string> {
    try {
      const feeData = await this.provider.getFeeData();
      return feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : '0';
    } catch (error) {
      console.error('Failed to get gas price:', error);
      throw error;
    }
  }

  /**
   * Get the ethers provider instance
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Get the wallet signer if connected
   */
  getSigner(): ethers.Wallet | null {
    return this.wallet;
  }
}
