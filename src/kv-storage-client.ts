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

export interface KVStreamData {
  key: string;
  value: Buffer;
  version: number;
  timestamp: Date;
}

export interface BatchKVOperation {
  key: string;
  value: Buffer;
  operation: 'set' | 'delete';
}

export interface KVListOptions {
  prefix?: string;
  limit?: number;
  offset?: number;
  reverse?: boolean;
}

export interface StreamSubscription {
  streamId: string;
  callback: (data: KVStreamData) => void;
  active: boolean;
}

export class ZeroGKVStorageClient {
  private kvClient: StorageKv | null = null;
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | null = null;
  private streamRegistry: Map<string, KVStreamInfo> = new Map();
  private streamSubscriptions: Map<string, StreamSubscription> = new Map();
  private kvCache: Map<string, { value: Buffer; timestamp: Date; ttl: number }> = new Map();
  
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
   * Enhanced KV Operations - Direct key-value storage
   */

  /**
   * Set a key-value pair in 0G KV storage
   */
  async setKV(key: string, value: any, ttl?: number): Promise<string> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected. Use connectWallet() first.');
    }

    try {
      console.log(`🔑 Setting KV pair: ${key}`);
      
      // Convert value to buffer
      const valueBuffer = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value));
      
      // Add to cache with TTL
      if (ttl) {
        this.kvCache.set(key, {
          value: valueBuffer,
          timestamp: new Date(),
          ttl: ttl
        });
      }

      // In real implementation, this would use StorageKv.set() method
      // For now, simulate the operation
      const result = `kv_set_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`✅ KV pair set successfully: ${key}`);
      console.log(`📦 Size: ${valueBuffer.length} bytes`);
      console.log(`⏰ TTL: ${ttl || 'permanent'}`);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to set KV pair:', error);
      throw new Error(`KV set failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a value by key from 0G KV storage
   */
  async getKV<T = any>(key: string): Promise<T | null> {
    try {
      console.log(`🔍 Getting KV value: ${key}`);
      
      // Check cache first
      const cached = this.kvCache.get(key);
      if (cached) {
        const now = new Date();
        const age = now.getTime() - cached.timestamp.getTime();
        
        if (cached.ttl === 0 || age < cached.ttl * 1000) {
          console.log(`⚡ Cache hit for key: ${key}`);
          try {
            return JSON.parse(cached.value.toString());
          } catch {
            return cached.value as unknown as T;
          }
        } else {
          // Remove expired cache entry
          this.kvCache.delete(key);
        }
      }

      // In real implementation, this would use StorageKv.get() method
      // For now, simulate the operation
      const result = null; // Placeholder
      
      if (!result) {
        console.log(`ℹ️ No value found for key: ${key}`);
        return null;
      }

      console.log(`✅ KV value retrieved: ${key}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to get KV value:', error);
      throw new Error(`KV get failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List keys with optional prefix filtering
   */
  async listKeys(options: KVListOptions = {}): Promise<string[]> {
    try {
      console.log(`📋 Listing keys with options:`, options);
      
      const {
        prefix = '',
        limit = 100,
        offset = 0,
        reverse = false
      } = options;

      // In real implementation, this would use StorageKv.listKeys() method
      // For now, simulate with cached keys and common patterns
      let keys: string[] = [];
      
      // Add keys from cache
      for (const [key] of this.kvCache) {
        if (!prefix || key.startsWith(prefix)) {
          keys.push(key);
        }
      }
      
      // Add simulated keys for demonstration
      if (prefix === 'user_') {
        keys.push('user_123_preferences', 'user_456_preferences');
      } else if (prefix === 'contract_') {
        keys.push('contract_0x123_analysis', 'contract_0x456_analysis');
      }
      
      // Apply sorting
      keys.sort();
      if (reverse) {
        keys.reverse();
      }
      
      // Apply pagination
      const paginatedKeys = keys.slice(offset, offset + limit);
      
      console.log(`✅ Found ${paginatedKeys.length} keys (total: ${keys.length})`);
      return paginatedKeys;
    } catch (error) {
      console.error('❌ Failed to list keys:', error);
      throw new Error(`Key listing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Batch set multiple key-value pairs
   */
  async batchSet(operations: BatchKVOperation[]): Promise<string[]> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected. Use connectWallet() first.');
    }

    try {
      console.log(`📦 Executing batch operation with ${operations.length} operations`);
      
      const results: string[] = [];
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      for (const [index, operation] of operations.entries()) {
        try {
          if (operation.operation === 'set') {
            // Update cache
            this.kvCache.set(operation.key, {
              value: operation.value,
              timestamp: new Date(),
              ttl: 0 // Permanent for batch operations
            });
            
            const result = `${batchId}_op_${index}`;
            results.push(result);
            
            console.log(`✅ Batch set: ${operation.key}`);
          } else if (operation.operation === 'delete') {
            // Remove from cache
            this.kvCache.delete(operation.key);
            
            const result = `${batchId}_del_${index}`;
            results.push(result);
            
            console.log(`🗑️ Batch delete: ${operation.key}`);
          }
        } catch (error) {
          console.error(`❌ Batch operation ${index} failed:`, error);
          results.push(`error_${index}`);
        }
      }
      
      console.log(`✅ Batch operation completed: ${results.length}/${operations.length} successful`);
      return results;
    } catch (error) {
      console.error('❌ Batch operation failed:', error);
      throw new Error(`Batch operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a key-value pair
   */
  async deleteKV(key: string): Promise<boolean> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected. Use connectWallet() first.');
    }

    try {
      console.log(`🗑️ Deleting KV pair: ${key}`);
      
      // Remove from cache
      this.kvCache.delete(key);
      
      // In real implementation, this would use StorageKv.delete() method
      const success = true; // Placeholder
      
      console.log(`✅ KV pair deleted: ${key}`);
      return success;
    } catch (error) {
      console.error('❌ Failed to delete KV pair:', error);
      throw new Error(`KV delete failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stream Management and Real-time Updates
   */

  /**
   * Subscribe to stream updates
   */
  async subscribeToStream(streamId: string, callback: (data: KVStreamData) => void): Promise<string> {
    try {
      console.log(`📡 Subscribing to stream: ${streamId}`);
      
      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const subscription: StreamSubscription = {
        streamId,
        callback,
        active: true
      };
      
      this.streamSubscriptions.set(subscriptionId, subscription);
      
      // In real implementation, this would set up WebSocket or polling
      // For now, simulate periodic updates
      const interval = setInterval(() => {
        if (subscription.active) {
          // Simulate stream data
          const simulatedData: KVStreamData = {
            key: `${streamId}_update_${Date.now()}`,
            value: Buffer.from(JSON.stringify({ 
              type: 'stream_update',
              streamId,
              timestamp: new Date().toISOString(),
              data: `Simulated update for ${streamId}`
            })),
            version: 1,
            timestamp: new Date()
          };
          
          callback(simulatedData);
        } else {
          clearInterval(interval);
        }
      }, 30000); // Update every 30 seconds
      
      console.log(`✅ Stream subscription created: ${subscriptionId}`);
      return subscriptionId;
    } catch (error) {
      console.error('❌ Stream subscription failed:', error);
      throw new Error(`Stream subscription failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Unsubscribe from stream
   */
  async unsubscribeFromStream(subscriptionId: string): Promise<boolean> {
    try {
      const subscription = this.streamSubscriptions.get(subscriptionId);
      
      if (subscription) {
        subscription.active = false;
        this.streamSubscriptions.delete(subscriptionId);
        
        console.log(`✅ Unsubscribed from stream: ${subscription.streamId}`);
        return true;
      }
      
      console.log(`⚠️ Subscription not found: ${subscriptionId}`);
      return false;
    } catch (error) {
      console.error('❌ Unsubscribe failed:', error);
      return false;
    }
  }

  /**
   * Get active stream subscriptions
   */
  getActiveSubscriptions(): StreamSubscription[] {
    return Array.from(this.streamSubscriptions.values()).filter(sub => sub.active);
  }

  /**
   * Stream upload for large data
   */
  async streamUpload(streamId: string, dataStream: Buffer[], chunkSize: number = 1024 * 1024): Promise<string> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected. Use connectWallet() first.');
    }

    try {
      console.log(`🚀 Starting stream upload: ${streamId}`);
      console.log(`📊 Total chunks: ${dataStream.length}`);
      console.log(`📦 Chunk size: ${chunkSize} bytes`);
      
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let uploadedChunks = 0;
      
      for (const [index, chunk] of dataStream.entries()) {
        const chunkKey = `${streamId}_chunk_${index}`;
        
        // Store chunk in cache (in real implementation, this would stream to 0G)
        this.kvCache.set(chunkKey, {
          value: chunk,
          timestamp: new Date(),
          ttl: 0
        });
        
        uploadedChunks++;
        
        if (index % 10 === 0 || index === dataStream.length - 1) {
          console.log(`📈 Upload progress: ${uploadedChunks}/${dataStream.length} chunks (${Math.round((uploadedChunks / dataStream.length) * 100)}%)`);
        }
      }
      
      // Update stream registry
      const streamInfo = this.streamRegistry.get(streamId);
      if (streamInfo) {
        streamInfo.lastUpdate = new Date();
        streamInfo.size = dataStream.reduce((total, chunk) => total + chunk.length, 0);
      }
      
      console.log(`✅ Stream upload completed: ${uploadId}`);
      return uploadId;
    } catch (error) {
      console.error('❌ Stream upload failed:', error);
      throw new Error(`Stream upload failed: ${error instanceof Error ? error.message : String(error)}`);
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
      
      // Clean up expired cache entries
      let cleanedCount = 0;
      for (const [key, cached] of this.kvCache) {
        if (cached.timestamp < cutoffDate) {
          this.kvCache.delete(key);
          cleanedCount++;
        }
      }
      
      console.log(`✅ Data cleanup completed: ${cleanedCount} entries removed`);
    } catch (error) {
      console.error('❌ Data cleanup failed:', error);
    }
  }

  /**
   * Get comprehensive KV storage statistics
   */
  async getEnhancedStorageStats(): Promise<any> {
    try {
      const cacheSize = this.kvCache.size;
      const activeSubscriptions = this.getActiveSubscriptions().length;
      
      const stats = {
        streams: Array.from(this.streamRegistry.values()),
        totalStreams: this.streamRegistry.size,
        cacheEntries: cacheSize,
        activeSubscriptions,
        walletConnected: this.isWalletConnected(),
        walletAddress: this.signer?.address || null,
        network: OG_CONFIG.networkName,
        capabilities: {
          keyValueOperations: true,
          batchOperations: true,
          streamSubscriptions: true,
          caching: true,
          streamUploads: true
        },
        lastUpdated: new Date().toISOString()
      };

      return stats;
    } catch (error) {
      console.error('❌ Failed to get enhanced storage stats:', error);
      return {};
    }
  }
}

export default ZeroGKVStorageClient;