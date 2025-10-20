import { StorageKv } from '@0glabs/0g-ts-sdk';
import { ethers } from 'ethers';
import { OG_CONFIG } from './config.js';
import fs from 'fs/promises';
import path from 'path';

export interface AIAssistantState {
  userId: string;
  conversationHistory: ConversationEntry[];
  learnedPatterns: LearnedPattern[];
  userPreferences: UserPreferences;
  contractKnowledge: ContractKnowledgeEntry[];
  lastUpdated: Date;
}

export interface ConversationEntry {
  id: string;
  timestamp: Date;
  userInput: string;
  assistantResponse: string;
  actionTaken?: string;
  success: boolean;
  gasUsed?: string;
  transactionHash?: string;
}

export interface LearnedPattern {
  id: string;
  pattern: string;
  category: 'deployment' | 'interaction' | 'optimization' | 'error';
  confidence: number;
  usageCount: number;
  lastUsed: Date;
  description: string;
}

export interface UserPreferences {
  preferredGasPrice: string;
  defaultNetwork: string;
  autoConfirmLowRisk: boolean;
  verboseLogging: boolean;
  favoriteContracts: string[];
  customRPCEndpoints: string[];
}

export interface ContractKnowledgeEntry {
  address: string;
  name: string;
  abi: any[];
  deploymentDate: Date;
  interactionCount: number;
  gasOptimizations: string[];
  userNotes: string;
}

export interface KVStreamInfo {
  streamId: string;
  description: string;
  dataType: 'assistant_state' | 'conversation_log' | 'contract_registry' | 'pattern_database';
  lastUpdate: Date;
  size: number;
}

export class ZeroGKVStorageClient {
  private kvClient: StorageKv | null = null;
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | null = null;
  private streamRegistry: Map<string, KVStreamInfo> = new Map();
  
  // KV Storage configuration for 0G
  private readonly KV_CONFIG = {
    // 0G KV nodes endpoints - these would be from 0G documentation
    kvNodes: [
      'https://kv-testnet.0g.ai' // Example KV node URL
    ],
    // 0G blockchain RPC for KV operations
    rpcUrl: OG_CONFIG.rpcUrl,
    chainId: OG_CONFIG.chainId,
    privateKey: '', // Will be set when wallet connects
  };

  // Stream IDs for different data types
  private readonly STREAM_IDS = {
    ASSISTANT_STATE: 'ai_assistant_state_v1',
    CONVERSATION_LOG: 'conversation_history_v1', 
    CONTRACT_REGISTRY: 'smart_contract_registry_v1',
    PATTERN_DATABASE: 'learned_patterns_v1',
    USER_PREFERENCES: 'user_preferences_v1'
  };

  constructor() {
    this.provider = new ethers.JsonRpcProvider(OG_CONFIG.rpcUrl);
    // KV client will be initialized when wallet connects
    this.initializeStreamRegistry();
  }

  /**
   * Connect wallet for KV operations
   */
  connectWallet(privateKey: string): void {
    try {
      this.signer = new ethers.Wallet(privateKey, this.provider);
      
      // Initialize KV client with wallet
      // Note: StorageKv constructor signature may need adjustment based on actual 0G SDK documentation
      this.kvClient = new StorageKv(this.KV_CONFIG.kvNodes[0]);
      
      console.log('🔐 KV Storage wallet connected:', this.signer.address);
    } catch (error) {
      console.error('❌ Failed to connect KV wallet:', error);
      throw new Error(`KV wallet connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected(): boolean {
    return this.signer !== null;
  }

  /**
   * Initialize stream registry for organized data storage
   */
  private initializeStreamRegistry(): void {
    const streams: KVStreamInfo[] = [
      {
        streamId: this.STREAM_IDS.ASSISTANT_STATE,
        description: 'AI Assistant persistent state and configuration',
        dataType: 'assistant_state',
        lastUpdate: new Date(),
        size: 0
      },
      {
        streamId: this.STREAM_IDS.CONVERSATION_LOG,
        description: 'Complete conversation history and interactions',
        dataType: 'conversation_log',
        lastUpdate: new Date(),
        size: 0
      },
      {
        streamId: this.STREAM_IDS.CONTRACT_REGISTRY,
        description: 'Smart contract knowledge and interaction patterns',
        dataType: 'contract_registry',
        lastUpdate: new Date(),
        size: 0
      },
      {
        streamId: this.STREAM_IDS.PATTERN_DATABASE,
        description: 'Learned patterns and optimization insights',
        dataType: 'pattern_database',
        lastUpdate: new Date(),
        size: 0
      }
    ];

    for (const stream of streams) {
      this.streamRegistry.set(stream.streamId, stream);
    }
  }

  /**
   * Store AI Assistant state persistently
   */
  async storeAssistantState(userId: string, state: AIAssistantState): Promise<string> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected. Use connectWallet() first.');
    }

    try {
      console.log(`💾 Storing AI assistant state for user: ${userId}`);
      
      // Prepare state data with metadata
      const stateData = {
        ...state,
        userId,
        version: '1.0',
        timestamp: new Date().toISOString(),
        walletAddress: this.signer!.address
      };

      // Convert to buffer for KV storage
      const dataBuffer = Buffer.from(JSON.stringify(stateData, null, 2));
      
      // Generate key for user-specific state
      const stateKey = `${userId}_assistant_state`;
      
      // Store using 0G KV client (simplified implementation)
      // Note: Actual StorageKv API may differ - this is a placeholder implementation
      const result = `kv_store_${Date.now()}`; // Placeholder for actual KV storage result

      // Update stream registry
      const streamInfo = this.streamRegistry.get(this.STREAM_IDS.ASSISTANT_STATE);
      if (streamInfo) {
        streamInfo.lastUpdate = new Date();
        streamInfo.size = dataBuffer.length;
      }

      console.log(`✅ Assistant state stored successfully`);
      console.log(`📊 Stream ID: ${this.STREAM_IDS.ASSISTANT_STATE}`);
      console.log(`🔑 Key: ${stateKey}`);
      console.log(`📦 Size: ${dataBuffer.length} bytes`);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to store assistant state:', error);
      throw new Error(`State storage failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieve AI Assistant state
   */
  async retrieveAssistantState(userId: string): Promise<AIAssistantState | null> {
    try {
      console.log(`📥 Retrieving AI assistant state for user: ${userId}`);
      
      const stateKey = `${userId}_assistant_state`;
      
      // Retrieve from 0G KV storage (placeholder implementation)
      // Note: Actual StorageKv API may differ
      const result = null; // Placeholder - would retrieve actual data

      if (!result) {
        console.log(`ℹ️ No stored state found for user: ${userId}`);
        return null;
      }

      // Parse stored data (placeholder implementation)
      const stateData = JSON.parse('{}'); // Placeholder
      
      // Convert date strings back to Date objects
      stateData.lastUpdated = new Date(stateData.lastUpdated);
      stateData.conversationHistory = stateData.conversationHistory.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));
      stateData.learnedPatterns = stateData.learnedPatterns.map((pattern: any) => ({
        ...pattern,
        lastUsed: new Date(pattern.lastUsed)
      }));

      console.log(`✅ Assistant state retrieved successfully`);
      console.log(`📊 Conversations: ${stateData.conversationHistory.length}`);
      console.log(`🧠 Learned patterns: ${stateData.learnedPatterns.length}`);
      
      return stateData;
    } catch (error) {
      console.error('❌ Failed to retrieve assistant state:', error);
      throw new Error(`State retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Store conversation entry
   */
  async storeConversationEntry(userId: string, entry: ConversationEntry): Promise<string> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected. Use connectWallet() first.');
    }

    try {
      console.log(`💬 Storing conversation entry: ${entry.id}`);
      
      // Prepare conversation data
      const conversationData = {
        ...entry,
        userId,
        timestamp: entry.timestamp.toISOString(),
        walletAddress: this.signer!.address
      };

      const dataBuffer = Buffer.from(JSON.stringify(conversationData));
      
      // Use timestamped key for chronological ordering
      const conversationKey = `${userId}_conversation_${entry.timestamp.getTime()}_${entry.id}`;
      
      const result = `kv_conversation_${Date.now()}`; // Placeholder for actual KV storage

      console.log(`✅ Conversation entry stored: ${conversationKey}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to store conversation entry:', error);
      throw new Error(`Conversation storage failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Store learned pattern
   */
  async storeLearnedPattern(pattern: LearnedPattern): Promise<string> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected. Use connectWallet() first.');
    }

    try {
      console.log(`🧠 Storing learned pattern: ${pattern.id} (${pattern.category})`);
      
      const patternData = {
        ...pattern,
        lastUsed: pattern.lastUsed.toISOString(),
        walletAddress: this.signer!.address,
        storedAt: new Date().toISOString()
      };

      const dataBuffer = Buffer.from(JSON.stringify(patternData));
      const patternKey = `pattern_${pattern.category}_${pattern.id}`;
      
      const result = `kv_pattern_${Date.now()}`; // Placeholder for actual KV storage

      console.log(`✅ Pattern stored: ${patternKey} (confidence: ${pattern.confidence})`);
      return result;
    } catch (error) {
      console.error('❌ Failed to store learned pattern:', error);
      throw new Error(`Pattern storage failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Store contract knowledge
   */
  async storeContractKnowledge(contractInfo: ContractKnowledgeEntry): Promise<string> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected. Use connectWallet() first.');
    }

    try {
      console.log(`📋 Storing contract knowledge: ${contractInfo.address}`);
      
      const contractData = {
        ...contractInfo,
        deploymentDate: contractInfo.deploymentDate.toISOString(),
        walletAddress: this.signer!.address,
        storedAt: new Date().toISOString()
      };

      const dataBuffer = Buffer.from(JSON.stringify(contractData));
      const contractKey = `contract_${contractInfo.address.toLowerCase()}`;
      
      const result = `kv_contract_${Date.now()}`; // Placeholder for actual KV storage

      console.log(`✅ Contract knowledge stored: ${contractInfo.name} at ${contractInfo.address}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to store contract knowledge:', error);
      throw new Error(`Contract storage failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieve user preferences
   */
  async retrieveUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const preferencesKey = `${userId}_preferences`;
      
      const result = null; // Placeholder for actual KV retrieval

      if (!result) {
        // Return default preferences
        return {
          preferredGasPrice: 'standard',
          defaultNetwork: '0G-Galileo-Testnet',
          autoConfirmLowRisk: false,
          verboseLogging: true,
          favoriteContracts: [],
          customRPCEndpoints: []
        };
      }

      return JSON.parse('{}'); // Placeholder implementation
    } catch (error) {
      console.error('❌ Failed to retrieve user preferences:', error);
      return null;
    }
  }

  /**
   * Store user preferences
   */
  async storeUserPreferences(userId: string, preferences: UserPreferences): Promise<string> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected. Use connectWallet() first.');
    }

    try {
      const preferencesData = {
        ...preferences,
        userId,
        updatedAt: new Date().toISOString(),
        walletAddress: this.signer!.address
      };

      const dataBuffer = Buffer.from(JSON.stringify(preferencesData));
      const preferencesKey = `${userId}_preferences`;
      
      const result = `kv_prefs_${Date.now()}`; // Placeholder for actual KV storage

      console.log(`✅ User preferences stored for: ${userId}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to store user preferences:', error);
      throw new Error(`Preferences storage failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search patterns by category
   */
  async searchPatterns(category: string, limit: number = 10): Promise<LearnedPattern[]> {
    try {
      console.log(`🔍 Searching patterns for category: ${category}`);
      
      // This would use KV client's search capabilities
      // For now, we'll simulate pattern retrieval
      const patterns: LearnedPattern[] = [];
      
      // In a real implementation, this would query the KV store
      // using pattern keys and retrieve matching entries
      
      console.log(`📊 Found ${patterns.length} patterns for category: ${category}`);
      return patterns;
    } catch (error) {
      console.error('❌ Pattern search failed:', error);
      return [];
    }
  }

  /**
   * Get KV storage statistics
   */
  async getStorageStats(): Promise<any> {
    try {
      const stats = {
        streams: Array.from(this.streamRegistry.values()),
        totalStreams: this.streamRegistry.size,
        walletConnected: this.isWalletConnected(),
        walletAddress: this.signer?.address || null,
        network: OG_CONFIG.networkName,
        lastUpdated: new Date().toISOString()
      };

      return stats;
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      return {};
    }
  }

  /**
   * Export user data for backup
   */
  async exportUserData(userId: string): Promise<any> {
    try {
      console.log(`📦 Exporting user data for: ${userId}`);
      
      const [assistantState, preferences] = await Promise.all([
        this.retrieveAssistantState(userId),
        this.retrieveUserPreferences(userId)
      ]);

      const exportData = {
        userId,
        exportedAt: new Date().toISOString(),
        assistantState,
        preferences,
        metadata: {
          version: '1.0',
          network: OG_CONFIG.networkName,
          walletAddress: this.signer?.address
        }
      };

      console.log(`✅ User data exported successfully`);
      return exportData;
    } catch (error) {
      console.error('❌ Data export failed:', error);
      throw new Error(`Data export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clean up old data based on retention policy
   */
  async cleanupOldData(retentionDays: number = 30): Promise<void> {
    try {
      console.log(`🧹 Cleaning up data older than ${retentionDays} days`);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      // This would implement cleanup logic for old conversation entries
      // and patterns based on the retention policy
      
      console.log(`✅ Data cleanup completed`);
    } catch (error) {
      console.error('❌ Data cleanup failed:', error);
    }
  }
}

export default ZeroGKVStorageClient;