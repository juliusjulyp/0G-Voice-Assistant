/**
 * Browser-based 0G Inference Client using MetaMask and other browser wallets
 * This implementation uses BrowserProvider instead of private keys for better security
 */

import { BrowserProvider } from 'ethers';
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';

export interface BrowserInferenceRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface BrowserInferenceResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost?: number;
  provider?: string;
  verified?: boolean;
}

export interface WalletInfo {
  address: string;
  chainId: number;
  balance: string;
  connected: boolean;
}

export class Browser0GInferenceClient {
  private broker: any = null;
  private provider: BrowserProvider | null = null;
  private signer: any = null;
  private isInitialized: boolean = false;
  private walletInfo: WalletInfo | null = null;

  // Official 0G AI model providers
  private readonly MODELS = {
    'gpt-oss-120b': {
      provider: '0xf07240Efa67755B5311bc75784a061eDB47165Dd',
      name: 'GPT-OSS-120B',
      description: 'Large language model optimized for general tasks'
    },
    'deepseek-r1-70b': {
      provider: '0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3',
      name: 'DeepSeek-R1-70B',
      description: 'Advanced reasoning model with enhanced capabilities'
    }
  };

  constructor() {
    console.log('🌐 Browser 0G Inference Client initialized');
  }

  /**
   * Check if MetaMask or compatible wallet is available
   */
  isWalletAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }

  /**
   * Connect to browser wallet (MetaMask, etc.)
   */
  async connectWallet(): Promise<WalletInfo> {
    try {
      if (!this.isWalletAvailable()) {
        throw new Error('No browser wallet detected. Please install MetaMask or a compatible wallet.');
      }

      console.log('🔐 Connecting to browser wallet...');

      // Request wallet connection
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Create browser provider and signer
      this.provider = new BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();

      // Get wallet information
      const address = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      const balance = await this.provider.getBalance(address);

      this.walletInfo = {
        address,
        chainId: Number(network.chainId),
        balance: balance.toString(),
        connected: true
      };

      console.log('✅ Browser wallet connected:');
      console.log(`   Address: ${address}`);
      console.log(`   Chain ID: ${network.chainId}`);
      console.log(`   Balance: ${balance.toString()} wei`);

      // Check if we're on 0G network
      if (Number(network.chainId) !== 16602) {
        console.warn('⚠️ Not connected to 0G Galileo Testnet (Chain ID: 16602)');
        console.warn('   You may need to switch networks for 0G services to work properly');
      }

      return this.walletInfo;

    } catch (error) {
      console.error('❌ Failed to connect wallet:', error);
      throw new Error(`Wallet connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Initialize 0G Serving Broker with browser wallet
   */
  async initializeBroker(): Promise<void> {
    try {
      if (!this.signer) {
        throw new Error('Wallet not connected. Call connectWallet() first.');
      }

      console.log('🤖 Initializing 0G Serving Broker with browser wallet...');

      // Create the broker instance with browser signer
      this.broker = await createZGComputeNetworkBroker(this.signer);
      
      console.log('✅ 0G Serving Broker initialized successfully');

      // Try to check account balance
      try {
        const account = await this.broker.ledger.getLedger();
        console.log(`💰 0G Compute account balance: ${account.balance} tokens`);

        // If balance is very low, suggest adding funds
        if (parseFloat(account.balance) < 1.0) {
          console.warn('⚠️ Low compute account balance. Consider adding funds for AI operations.');
        }
      } catch (balanceError) {
        console.warn('⚠️ Could not check compute account balance:', balanceError instanceof Error ? balanceError.message : String(balanceError));
      }

      // Try to discover available services
      try {
        const services = await this.broker.inference.listService();
        console.log(`🔍 Found ${services.length} available AI services`);
        
        // Log available models
        const availableModels = services.filter((s: any) => 
          s.model === 'gpt-oss-120b' || s.model === 'deepseek-r1-70b'
        );
        console.log(`📋 Available 0G AI models: ${availableModels.map((s: any) => s.model).join(', ')}`);
        
      } catch (serviceError) {
        console.warn('⚠️ Could not discover services:', serviceError instanceof Error ? serviceError.message : String(serviceError));
      }

      this.isInitialized = true;
      console.log('🎉 Browser 0G AI client ready for inference!');

    } catch (error) {
      console.error('❌ Failed to initialize 0G broker:', error);
      throw new Error(`Broker initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Run AI inference using 0G Compute Network
   */
  async runInference(request: BrowserInferenceRequest): Promise<BrowserInferenceResponse> {
    if (!this.isInitialized || !this.broker) {
      throw new Error('Client not initialized. Call initializeBroker() first.');
    }

    try {
      console.log(`🧠 Running AI inference with model: ${request.model}`);

      // Get provider for the requested model
      const modelInfo = this.MODELS[request.model as keyof typeof this.MODELS];
      if (!modelInfo) {
        throw new Error(`Unsupported model: ${request.model}. Available: ${Object.keys(this.MODELS).join(', ')}`);
      }

      const providerAddress = modelInfo.provider;
      console.log(`🏪 Using provider: ${providerAddress}`);

      // Get service metadata
      let serviceEndpoint: string;
      try {
        const metadata = await this.broker.inference.getServiceMetadata(providerAddress);
        serviceEndpoint = metadata.endpoint;
        console.log(`📡 Service endpoint: ${serviceEndpoint}`);
      } catch (metadataError) {
        throw new Error(`Could not get service metadata: ${metadataError instanceof Error ? metadataError.message : String(metadataError)}`);
      }

      // Acknowledge provider (required for billing)
      try {
        await this.broker.inference.acknowledgeProviderSigner(providerAddress);
        console.log('✅ Provider acknowledged for billing');
      } catch (ackError) {
        console.warn('⚠️ Provider acknowledgment failed:', ackError instanceof Error ? ackError.message : String(ackError));
      }

      // Generate authentication headers
      const chatID = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      let headers: any = {
        'Content-Type': 'application/json'
      };

      try {
        const authHeaders = await this.broker.inference.generateRequestHeaders(
          providerAddress,
          JSON.stringify(request),
          chatID
        );
        headers = { ...headers, ...authHeaders };
        console.log('🔑 Authentication headers generated');
      } catch (headerError) {
        console.warn('⚠️ Could not generate auth headers:', headerError instanceof Error ? headerError.message : String(headerError));
        console.log('🔄 Proceeding without authentication...');
      }

      // Make the inference request
      console.log('📡 Sending inference request...');
      const response = await fetch(serviceEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          max_tokens: request.max_tokens || 150,
          temperature: request.temperature || 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Inference request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Inference response received');

      // Process response through 0G verification
      let verified = false;
      try {
        const processResult = await this.broker.inference.processResponse(
          providerAddress,
          JSON.stringify(result),
          chatID
        );
        verified = !!processResult;
        console.log(`🔐 Response verification: ${verified ? 'VERIFIED' : 'UNVERIFIED'}`);
      } catch (verifyError) {
        console.warn('⚠️ Response verification failed:', verifyError instanceof Error ? verifyError.message : String(verifyError));
      }

      // Format response
      const inferenceResponse: BrowserInferenceResponse = {
        id: chatID,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: result.choices || [{
          index: 0,
          message: {
            role: 'assistant',
            content: result.response || result.choices?.[0]?.message?.content || 'No response generated'
          },
          finish_reason: 'stop'
        }],
        usage: result.usage || {
          prompt_tokens: request.messages.reduce((acc, msg) => acc + Math.ceil(msg.content.length / 4), 0),
          completion_tokens: Math.ceil((result.response || result.choices?.[0]?.message?.content || '').length / 4),
          total_tokens: 0
        },
        provider: providerAddress,
        verified
      };

      // Calculate total tokens
      inferenceResponse.usage.total_tokens = 
        inferenceResponse.usage.prompt_tokens + inferenceResponse.usage.completion_tokens;

      console.log(`🎉 AI inference completed successfully!`);
      console.log(`💬 Response: ${inferenceResponse.choices[0].message.content.substring(0, 100)}...`);
      
      return inferenceResponse;

    } catch (error) {
      console.error('❌ AI inference failed:', error);
      throw new Error(`Inference failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Simple text completion method
   */
  async complete(prompt: string, model: string = 'gpt-oss-120b'): Promise<string> {
    const request: BrowserInferenceRequest = {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.7
    };

    const response = await this.runInference(request);
    return response.choices[0].message.content;
  }

  /**
   * Chat interface for conversations
   */
  async chat(messages: Array<{role: 'user' | 'assistant' | 'system', content: string}>, model: string = 'gpt-oss-120b'): Promise<string> {
    const request: BrowserInferenceRequest = {
      model,
      messages,
      max_tokens: 300,
      temperature: 0.7
    };

    const response = await this.runInference(request);
    return response.choices[0].message.content;
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return Object.keys(this.MODELS);
  }

  /**
   * Get wallet information
   */
  getWalletInfo(): WalletInfo | null {
    return this.walletInfo;
  }

  /**
   * Check if client is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.broker !== null && this.walletInfo?.connected === true;
  }

  /**
   * Disconnect wallet
   */
  disconnect(): void {
    this.broker = null;
    this.provider = null;
    this.signer = null;
    this.isInitialized = false;
    this.walletInfo = null;
    console.log('🔌 Wallet disconnected');
  }

  /**
   * Switch to 0G Galileo Testnet
   */
  async switchTo0GNetwork(): Promise<void> {
    if (!this.isWalletAvailable()) {
      throw new Error('No wallet available');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x40EA' }], // 16602 in hex
      });
      console.log('✅ Switched to 0G Galileo Testnet');
    } catch (switchError: any) {
      // Chain not added to wallet
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x40EA',
              chainName: '0G Galileo Testnet',
              nativeCurrency: {
                name: '0G',
                symbol: '0G',
                decimals: 18
              },
              rpcUrls: ['https://evmrpc-testnet.0g.ai'],
              blockExplorerUrls: ['https://chainscan-galileo.0g.ai']
            }]
          });
          console.log('✅ 0G Galileo Testnet added and switched');
        } catch (addError) {
          throw new Error(`Failed to add 0G network: ${addError instanceof Error ? addError.message : String(addError)}`);
        }
      } else {
        throw new Error(`Failed to switch network: ${switchError.message}`);
      }
    }
  }
}

export default Browser0GInferenceClient;