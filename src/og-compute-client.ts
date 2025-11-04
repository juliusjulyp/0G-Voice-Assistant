/**
 * 0G Compute Network Client
 * Uses @0glabs/0g-serving-broker for decentralized AI compute
 */

import { ethers } from 'ethers';
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';

export interface ZGComputeProvider {
  address: string;
  serviceType: string;
  url: string;
  inputPrice: string;
  outputPrice: string;
  updatedAt: number;
  model: string;
  verifiability: string; // 'TeeML' for TEE verification, empty for none
  endpoint?: string;
}

export interface ZGInferenceRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ZGInferenceResponse {
  success: boolean;
  response?: string;
  provider?: string;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost?: number;
  latency?: number;
  jobId?: string;
  error?: string;
}

export class OGComputeClient {
  private broker: any = null;
  private wallet: ethers.Wallet | null = null;
  private provider: ethers.JsonRpcProvider | null = null;
  private isInitialized = false;
  private acknowledgedProviders = new Set<string>();
  private accountBalance = 0;


  constructor() {
    // Initialize will be called separately to handle async operations
  }

  /**
   * Initialize the 0G compute client
   */
  async initialize(privateKey?: string, rpcUrl?: string): Promise<void> {
    try {
      console.log('🚀 Initializing 0G Compute Network Client...');

      // Set up provider and wallet
      const networkRpcUrl = rpcUrl || process.env.ZERO_G_RPC_URL || 'https://evmrpc-testnet.0g.ai';
      this.provider = new ethers.JsonRpcProvider(networkRpcUrl);

      // Use provided private key or generate a new one for testing
      const walletKey = privateKey || process.env.ZERO_G_PRIVATE_KEY || ethers.Wallet.createRandom().privateKey;
      this.wallet = new ethers.Wallet(walletKey, this.provider);

      console.log('🔐 Wallet address:', this.wallet.address);

      // Initialize 0G serving broker
      this.broker = await createZGComputeNetworkBroker(this.wallet);
      console.log('✅ 0G Serving Broker initialized');

      // Check account balance
      await this.checkAccountBalance();

      this.isInitialized = true;
      console.log('✅ 0G Compute Client initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize 0G Compute Client:', error);
      throw new Error(`0G Compute initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check account balance
   */
  async checkAccountBalance(): Promise<number> {
    if (!this.broker) {
      throw new Error('Broker not initialized');
    }

    try {
      // Use the correct method from SDK inspection
      const account = await this.broker.inference.getAccount();
      this.accountBalance = parseFloat(account?.toString() || '0');
      console.log(`💰 Account balance: ${this.accountBalance} A0GI`);
      return this.accountBalance;
    } catch (error) {
      console.log('ℹ️ No account found or balance is 0');
      this.accountBalance = 0;
      return 0;
    }
  }

  /**
   * Add account and fund it
   */
  async fundAccount(amount: number): Promise<void> {
    if (!this.broker) {
      throw new Error('Broker not initialized');
    }

    try {
      console.log(`💳 Funding account with ${amount} A0GI...`);
      
      // Check wallet balance first
      const walletBalance = await this.provider?.getBalance(this.wallet?.address || '');
      const balanceInEther = walletBalance ? parseFloat(ethers.formatEther(walletBalance)) : 0;
      
      console.log(`💰 Wallet balance: ${balanceInEther} 0G`);
      
      // Estimate the minimum required balance (conversion + gas)
      const requiredForConversion = amount / 1000000; // A0GI to 0G conversion
      const estimatedGas = 0.01; // Rough estimate for gas fees
      const totalRequired = requiredForConversion + estimatedGas;
      
      if (balanceInEther < totalRequired) {
        const shortfall = totalRequired - balanceInEther;
        throw new Error(
          `INSUFFICIENT_TESTNET_TOKENS: Need ${totalRequired.toFixed(4)} 0G total ` +
          `(${requiredForConversion.toFixed(6)} 0G + ~${estimatedGas} 0G gas), ` +
          `but wallet has ${balanceInEther.toFixed(4)} 0G. ` +
          `Shortfall: ${shortfall.toFixed(4)} 0G. ` +
          `Get more tokens from https://faucet.0g.ai or request additional tokens in Discord.`
        );
      }
      
      // Use the correct method from SDK inspection
      try {
        await this.broker.ledger.addLedger(amount);
        console.log('✅ Account created and funded');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMsg.includes('insufficient funds')) {
          throw new Error(
            `INSUFFICIENT_TESTNET_TOKENS: Transaction failed due to insufficient 0G tokens. ` +
            `Your wallet has ${balanceInEther.toFixed(4)} 0G, but more is needed for gas fees. ` +
            `Please get more tokens from https://faucet.0g.ai (0.1 0G daily) or ` +
            `request additional tokens in the 0G Discord community.`
          );
        }
        
        // Account might already exist, try to deposit
        try {
          await this.broker.ledger.depositFund(amount);
          console.log('✅ Funds deposited to existing account');
        } catch (depositError) {
          const depositMsg = depositError instanceof Error ? depositError.message : 'Unknown error';
          
          if (depositMsg.includes('insufficient funds')) {
            throw new Error(
              `INSUFFICIENT_TESTNET_TOKENS: Deposit failed due to insufficient 0G tokens. ` +
              `Please get more tokens from https://faucet.0g.ai`
            );
          }
          
          throw new Error(`Account funding failed: ${depositMsg}`);
        }
      }

      await this.checkAccountBalance();
    } catch (error) {
      console.error('❌ Failed to fund account:', error);
      
      // Re-throw with preserved error message if it's already formatted
      if (error instanceof Error && error.message.startsWith('INSUFFICIENT_TESTNET_TOKENS:')) {
        throw error;
      }
      
      throw new Error(`Account funding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Discover available AI service providers
   */
  async getComputeProviders(): Promise<ZGComputeProvider[]> {
    if (!this.broker) {
      throw new Error('Broker not initialized');
    }

    try {
      console.log('🔍 Discovering 0G compute providers...');
      
      // Get list of providers from the network
      const providers = await this.broker.inference.listService();
      
      const discovered: ZGComputeProvider[] = [];
      for (const provider of providers) {
        try {
          // Services are returned as arrays with the structure we discovered:
          // [address, serviceType, url, inputPrice, outputPrice, updatedAt, model, verifiability, extra]
          const address = provider[0];
          const serviceType = provider[1];
          const url = provider[2];
          const inputPrice = provider[3];
          const outputPrice = provider[4];
          const updatedAt = provider[5];
          const model = provider[6];
          const verifiability = provider[7];
          
          const metadata = await this.broker.inference.getServiceMetadata(address);
          
          discovered.push({
            address: address,
            serviceType: serviceType || 'llm-inference',
            url: url || '',
            inputPrice: (typeof inputPrice === 'bigint' ? inputPrice.toString() : inputPrice) || '0.001',
            outputPrice: (typeof outputPrice === 'bigint' ? outputPrice.toString() : outputPrice) || '0.002',
            updatedAt: (typeof updatedAt === 'bigint' ? Number(updatedAt) : updatedAt) || Date.now(),
            model: model || metadata.model || 'unknown',
            verifiability: verifiability || '',
            endpoint: metadata.endpoint
          });
        } catch (error) {
          console.warn(`⚠️ Failed to get metadata for provider ${provider[0]}:`, error);
        }
      }

      console.log(`✅ Found ${discovered.length} compute providers`);
      return discovered;

    } catch (error) {
      console.error('❌ Failed to discover providers:', error);
      throw new Error(`Provider discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Acknowledge a provider before using their service
   */
  async acknowledgeProvider(providerAddress: string): Promise<void> {
    if (!this.broker) {
      throw new Error('Broker not initialized');
    }

    if (this.acknowledgedProviders.has(providerAddress)) {
      return; // Already acknowledged
    }

    try {
      console.log(`🤝 Acknowledging provider: ${providerAddress}`);
      await this.broker.inference.acknowledgeProviderSigner(providerAddress);
      this.acknowledgedProviders.add(providerAddress);
      console.log('✅ Provider acknowledged');
    } catch (error) {
      console.error('❌ Failed to acknowledge provider:', error);
      throw new Error(`Provider acknowledgment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Run inference using 0G compute network
   */
  async runInference(
    input: string,
    options: {
      model?: string;
      max_tokens?: number;
      temperature?: number;
      provider_address?: string;
    } = {}
  ): Promise<ZGInferenceResponse> {
    if (!this.isInitialized || !this.broker) {
      throw new Error('0G Compute client not initialized');
    }

    const startTime = Date.now();

    try {
      console.log('🧠 Running inference on 0G compute network...');
      console.log('Input:', input.substring(0, 100) + (input.length > 100 ? '...' : ''));

      // Get available providers
      const providers = await this.getComputeProviders();
      if (providers.length === 0) {
        throw new Error('No compute providers available');
      }

      // Select provider (by model preference or best available)
      const targetModel = options.model || 'gpt-oss-120b';
      let selectedProvider = providers.find(p => p.model === targetModel);
      if (!selectedProvider) {
        selectedProvider = providers[0]; // Use first available
      }

      console.log(`🎯 Selected provider: ${selectedProvider.address}`);
      console.log(`📋 Model: ${selectedProvider.model}`);

      // Acknowledge provider if not already done
      await this.acknowledgeProvider(selectedProvider.address);

      // Check balance
      if (this.accountBalance <= 0) {
        // Auto-fund for demonstration (10 A0GI)
        await this.fundAccount(10);
      }

      // Get service metadata
      const metadata = await this.broker.inference.getServiceMetadata(selectedProvider.address);
      
      // Prepare inference request
      const inferenceRequest: ZGInferenceRequest = {
        model: selectedProvider.model,
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant running on the 0G decentralized compute network. Provide helpful and accurate responses.'
          },
          {
            role: 'user',
            content: input
          }
        ],
        max_tokens: options.max_tokens || 500,
        temperature: options.temperature || 0.7,
        stream: false
      };

      // Generate request headers with billing info
      const headers = await this.broker.inference.getRequestHeaders(
        selectedProvider.address,
        JSON.stringify(inferenceRequest)
      );

      console.log('🔄 Sending inference request...');

      // Make request to provider endpoint
      const response = await fetch(metadata.endpoint + '/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(inferenceRequest)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const latency = Date.now() - startTime;

      // Process response for verification if applicable
      let isValid = true;
      if (selectedProvider.verifiability === 'TeeML') {
        try {
          isValid = await this.broker.inference.processResponse(
            selectedProvider.address,
            result.choices[0]?.message?.content || '',
            result.id
          );
          console.log(`🔐 TEE Verification: ${isValid ? 'VALID' : 'INVALID'}`);
        } catch (error) {
          console.warn('⚠️ TEE verification failed:', error);
        }
      }

      const responseText = result.choices[0]?.message?.content || 'No response generated';
      
      // Estimate cost
      const inputTokens = result.usage?.prompt_tokens || Math.ceil(input.length / 4);
      const outputTokens = result.usage?.completion_tokens || Math.ceil(responseText.length / 4);
      const estimatedCost = (inputTokens * parseFloat(selectedProvider.inputPrice)) + 
                           (outputTokens * parseFloat(selectedProvider.outputPrice));

      console.log('✅ Inference completed successfully!');
      console.log(`⚡ Latency: ${latency}ms`);
      console.log(`💰 Estimated cost: ${estimatedCost.toFixed(6)} A0GI`);

      return {
        success: true,
        response: responseText,
        provider: selectedProvider.address,
        model: selectedProvider.model,
        usage: {
          prompt_tokens: inputTokens,
          completion_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens
        },
        cost: estimatedCost,
        latency,
        jobId: result.id || `job_${Date.now()}`
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      console.error('❌ 0G Inference failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown inference error',
        latency
      };
    }
  }

  /**
   * Get account and provider statistics
   */
  async getComputeStats(): Promise<any> {
    if (!this.broker) {
      throw new Error('Broker not initialized');
    }

    try {
      const providers = await this.getComputeProviders();
      const balance = await this.checkAccountBalance();

      return {
        accountBalance: balance,
        acknowledgedProviders: this.acknowledgedProviders.size,
        availableProviders: providers.length,
        supportedModels: [...new Set(providers.map(p => p.model))],
        totalProviders: providers.length,
        teeProviders: providers.filter(p => p.verifiability === 'TeeML').length,
        walletAddress: this.wallet?.address,
        networkConnected: this.isInitialized
      };
    } catch (error) {
      console.error('Failed to get compute stats:', error);
      return {
        accountBalance: 0,
        acknowledgedProviders: 0,
        availableProviders: 0,
        supportedModels: [],
        totalProviders: 0,
        teeProviders: 0,
        walletAddress: this.wallet?.address,
        networkConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get available AI models
   */
  async getAvailableModels(): Promise<string[]> {
    const providers = await this.getComputeProviders();
    return [...new Set(providers.map(p => p.model))];
  }

  /**
   * Check if client is properly initialized
   */
  get isConnected(): boolean {
    return this.isInitialized && !!this.broker && !!this.wallet;
  }
}

// Export singleton instance
export const ogCompute = new OGComputeClient();

export default ogCompute;