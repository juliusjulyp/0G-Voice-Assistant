import { Indexer, Batcher, KvClient, getFlowContract } from '@0gfoundation/0g-ts-sdk';
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
  private indexer: Indexer;
  private kvReadClient: KvClient;
  private flowContract: any = null;
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | null = null;
  private storageNodes: any[] | null = null;
  private kvOperational: boolean = false;
  private streamRegistry: Map<string, KVStreamInfo> = new Map();
  private streamSubscriptions: Map<string, StreamSubscription> = new Map();
  private kvCache: Map<string, { value: Buffer; timestamp: Date; ttl: number }> = new Map();

  private readonly KV_CONFIG = {
    kvRpcUrl: OG_CONFIG.kvRpcUrl,
    indexerRpcUrl: OG_CONFIG.indexerRpcUrl,
    flowContractAddress: OG_CONFIG.flowContractAddress,
    rpcUrl: OG_CONFIG.rpcUrl,
    chainId: OG_CONFIG.chainId,
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
    this.indexer = new Indexer(this.KV_CONFIG.indexerRpcUrl);
    this.kvReadClient = new KvClient(this.KV_CONFIG.kvRpcUrl);
    this.initializeStreamRegistry();
  }

  connectWallet(privateKey: string): void {
    try {
      this.signer = new ethers.Wallet(privateKey, this.provider);
      this.flowContract = getFlowContract(this.KV_CONFIG.flowContractAddress, this.signer as any);
      this.kvOperational = true;
      console.log('KV Storage wallet connected:', this.signer.address);
    } catch (error) {
      console.error('Failed to connect KV wallet:', error);
      this.kvOperational = false;
      throw new Error(`KV wallet connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  isWalletConnected(): boolean {
    return this.signer !== null;
  }

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

  // --- Core KV helpers ---

  private streamIdToHex(name: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(name));
  }

  private async selectNodes(): Promise<any[]> {
    if (this.storageNodes && this.storageNodes.length > 0) {
      return this.storageNodes;
    }
    const [nodes, err] = await this.indexer.selectNodes(1);
    if (err !== null || !nodes || nodes.length === 0) {
      throw new Error(`Failed to select storage nodes: ${err}`);
    }
    this.storageNodes = nodes;
    return nodes;
  }

  private async kvWrite(streamId: string, key: string, data: string, retries: number = 3): Promise<string | null> {
    if (!this.signer || !this.flowContract) return null;

    const hexStreamId = this.streamIdToHex(streamId);
    const keyBytes = Buffer.from(key, 'utf-8');
    const dataBytes = Buffer.from(data, 'utf-8');

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const nodes = await this.selectNodes();
        const batcher = new Batcher(1, nodes, this.flowContract, this.signer as any);
        const streamDataBuilder = batcher.streamDataBuilder;
        streamDataBuilder.set(hexStreamId, keyBytes, dataBytes);
        const result = await batcher.exec();
        return String(result ?? `kv_write_${Date.now()}`);
      } catch (error) {
        console.error(`KV write attempt ${attempt}/${retries} failed:`, error);
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
          await new Promise(resolve => setTimeout(resolve, delay));
          this.storageNodes = null; // Force re-select on retry
        }
      }
    }
    return null;
  }

  private async kvRead(streamId: string, key: string): Promise<string | null> {
    try {
      const hexStreamId = this.streamIdToHex(streamId);
      const keyBytes = Buffer.from(key, 'utf-8');
      const result = await this.kvReadClient.getValue(hexStreamId, keyBytes);
      if (!result || !result.data) return null;
      const decoded = typeof result.data === 'string' ? result.data : Buffer.from(result.data).toString('utf-8');
      return decoded;
    } catch (error) {
      console.error(`KV read failed for ${streamId}/${key}:`, error);
      return null;
    }
  }

  private async writeWithCache(streamId: string, key: string, value: any): Promise<string> {
    const jsonStr = JSON.stringify(value);
    const valueBuffer = Buffer.from(jsonStr);

    // Update cache optimistically
    this.kvCache.set(`${streamId}:${key}`, {
      value: valueBuffer,
      timestamp: new Date(),
      ttl: 0
    });

    // Attempt  KV write
    if (this.kvOperational) {
      const txHash = await this.kvWrite(streamId, key, jsonStr);
      if (txHash) return txHash;
    }

    // Fallback: cache-only
    return `cache_only_${Date.now()}`;
  }

  private async readWithCache<T = any>(streamId: string, key: string): Promise<T | null> {
    // Try  KV read first
    if (this.kvOperational) {
      const raw = await this.kvRead(streamId, key);
      if (raw !== null) {
        try {
          const parsed = JSON.parse(raw) as T;
          // Update cache on success
          this.kvCache.set(`${streamId}:${key}`, {
            value: Buffer.from(raw),
            timestamp: new Date(),
            ttl: 0
          });
          return parsed;
        } catch {
          return raw as unknown as T;
        }
      }
    }

    // Fallback to cache
    const cached = this.kvCache.get(`${streamId}:${key}`);
    if (cached) {
      try {
        return JSON.parse(cached.value.toString()) as T;
      } catch {
        return cached.value as unknown as T;
      }
    }

    return null;
  }

  // --- Public methods (interface unchanged) ---

  async storeAssistantState(userId: string, state: AIAssistantState): Promise<string> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected. Use connectWallet() first.');
    }

    try {
      console.log(`Storing AI assistant state for user: ${userId}`);

      const stateData = {
        ...state,
        userId,
        version: '1.0',
        timestamp: new Date().toISOString(),
        walletAddress: this.signer!.address
      };

      const stateKey = `${userId}_assistant_state`;
      const result = await this.writeWithCache(this.STREAM_IDS.ASSISTANT_STATE, stateKey, stateData);

      const dataSize = Buffer.from(JSON.stringify(stateData)).length;
      const streamInfo = this.streamRegistry.get(this.STREAM_IDS.ASSISTANT_STATE);
      if (streamInfo) {
        streamInfo.lastUpdate = new Date();
        streamInfo.size = dataSize;
      }

      console.log(`Assistant state stored: ${stateKey} (${dataSize} bytes)`);
      return result;
    } catch (error) {
      console.error('Failed to store assistant state:', error);
      throw new Error(`State storage failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async retrieveAssistantState(userId: string): Promise<AIAssistantState | null> {
    try {
      console.log(`Retrieving AI assistant state for user: ${userId}`);

      const stateKey = `${userId}_assistant_state`;
      const stateData = await this.readWithCache<any>(this.STREAM_IDS.ASSISTANT_STATE, stateKey);

      if (!stateData) {
        console.log(`No stored state found for user: ${userId}`);
        return null;
      }

      // Convert date strings back to Date objects
      stateData.lastUpdated = new Date(stateData.lastUpdated);
      if (stateData.conversationHistory) {
        stateData.conversationHistory = stateData.conversationHistory.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
      }
      if (stateData.learnedPatterns) {
        stateData.learnedPatterns = stateData.learnedPatterns.map((pattern: any) => ({
          ...pattern,
          lastUsed: new Date(pattern.lastUsed)
        }));
      }

      console.log(`Assistant state retrieved for user: ${userId}`);
      return stateData;
    } catch (error) {
      console.error('Failed to retrieve assistant state:', error);
      throw new Error(`State retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async storeConversationEntry(userId: string, entry: ConversationEntry): Promise<string> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected. Use connectWallet() first.');
    }

    try {
      console.log(`Storing conversation entry: ${entry.id}`);

      const conversationData = {
        ...entry,
        userId,
        timestamp: entry.timestamp.toISOString(),
        walletAddress: this.signer!.address
      };

      const conversationKey = `${userId}_conversation_${entry.timestamp.getTime()}_${entry.id}`;
      const result = await this.writeWithCache(this.STREAM_IDS.CONVERSATION_LOG, conversationKey, conversationData);

      console.log(`Conversation entry stored: ${conversationKey}`);
      return result;
    } catch (error) {
      console.error('Failed to store conversation entry:', error);
      throw new Error(`Conversation storage failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async storeLearnedPattern(pattern: LearnedPattern): Promise<string> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected. Use connectWallet() first.');
    }

    try {
      console.log(`Storing learned pattern: ${pattern.id} (${pattern.category})`);

      const patternData = {
        ...pattern,
        lastUsed: pattern.lastUsed.toISOString(),
        walletAddress: this.signer!.address,
        storedAt: new Date().toISOString()
      };

      const patternKey = `pattern_${pattern.category}_${pattern.id}`;
      const result = await this.writeWithCache(this.STREAM_IDS.PATTERN_DATABASE, patternKey, patternData);

      console.log(`Pattern stored: ${patternKey} (confidence: ${pattern.confidence})`);
      return result;
    } catch (error) {
      console.error('Failed to store learned pattern:', error);
      throw new Error(`Pattern storage failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async storeContractKnowledge(contractInfo: ContractKnowledgeEntry): Promise<string> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected. Use connectWallet() first.');
    }

    try {
      console.log(`Storing contract knowledge: ${contractInfo.address}`);

      const contractData = {
        ...contractInfo,
        deploymentDate: contractInfo.deploymentDate.toISOString(),
        walletAddress: this.signer!.address,
        storedAt: new Date().toISOString()
      };

      const contractKey = `contract_${contractInfo.address.toLowerCase()}`;
      const result = await this.writeWithCache(this.STREAM_IDS.CONTRACT_REGISTRY, contractKey, contractData);

      console.log(`Contract knowledge stored: ${contractInfo.name} at ${contractInfo.address}`);
      return result;
    } catch (error) {
      console.error('Failed to store contract knowledge:', error);
      throw new Error(`Contract storage failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async retrieveUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const preferencesKey = `${userId}_preferences`;
      const result = await this.readWithCache<UserPreferences>(this.STREAM_IDS.USER_PREFERENCES, preferencesKey);

      if (!result) {
        return {
          preferredGasPrice: 'standard',
          defaultNetwork: '0G-Galileo-Testnet',
          autoConfirmLowRisk: false,
          verboseLogging: true,
          favoriteContracts: [],
          customRPCEndpoints: []
        };
      }

      return result;
    } catch (error) {
      console.error('Failed to retrieve user preferences:', error);
      return null;
    }
  }

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

      const preferencesKey = `${userId}_preferences`;
      const result = await this.writeWithCache(this.STREAM_IDS.USER_PREFERENCES, preferencesKey, preferencesData);

      console.log(`User preferences stored for: ${userId}`);
      return result;
    } catch (error) {
      console.error('Failed to store user preferences:', error);
      throw new Error(`Preferences storage failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async searchPatterns(category: string, limit: number = 10): Promise<LearnedPattern[]> {
    try {
      console.log(`Searching patterns for category: ${category}`);

      // 0G KV has no key enumeration, so search is cache-based
      const patterns: LearnedPattern[] = [];
      const prefix = `${this.STREAM_IDS.PATTERN_DATABASE}:pattern_${category}_`;

      for (const [cacheKey, cached] of this.kvCache) {
        if (cacheKey.startsWith(prefix) && patterns.length < limit) {
          try {
            const pattern = JSON.parse(cached.value.toString());
            pattern.lastUsed = new Date(pattern.lastUsed);
            patterns.push(pattern);
          } catch { /* skip unparseable */ }
        }
      }

      console.log(`Found ${patterns.length} patterns for category: ${category}`);
      return patterns;
    } catch (error) {
      console.error('Pattern search failed:', error);
      return [];
    }
  }

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
      console.error('Failed to get storage stats:', error);
      return {};
    }
  }

  async exportUserData(userId: string): Promise<any> {
    try {
      console.log(`Exporting user data for: ${userId}`);

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

      console.log(`User data exported successfully`);
      return exportData;
    } catch (error) {
      console.error('Data export failed:', error);
      throw new Error(`Data export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // --- Direct KV operations ---

  async setKV(key: string, value: any, ttl?: number): Promise<string> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected. Use connectWallet() first.');
    }

    try {
      console.log(`Setting KV pair: ${key}`);

      const valueBuffer = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value));

      // Always cache (with optional TTL)
      this.kvCache.set(key, {
        value: valueBuffer,
        timestamp: new Date(),
        ttl: ttl || 0
      });

      // Attempt real KV write
      const result = await this.writeWithCache('user_data_v1', key, value);

      console.log(`KV pair set: ${key} (${valueBuffer.length} bytes)`);
      return result;
    } catch (error) {
      console.error('Failed to set KV pair:', error);
      throw new Error(`KV set failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getKV<T = any>(key: string): Promise<T | null> {
    try {
      console.log(`Getting KV value: ${key}`);

      // Check direct cache first (for setKV entries with TTL)
      const cached = this.kvCache.get(key);
      if (cached) {
        const now = new Date();
        const age = now.getTime() - cached.timestamp.getTime();

        if (cached.ttl === 0 || age < cached.ttl * 1000) {
          console.log(`Cache hit for key: ${key}`);
          try {
            return JSON.parse(cached.value.toString());
          } catch {
            return cached.value as unknown as T;
          }
        } else {
          this.kvCache.delete(key);
        }
      }

      // Try  KV read
      const result = await this.readWithCache<T>('user_data_v1', key);

      if (!result) {
        console.log(`No value found for key: ${key}`);
        return null;
      }

      console.log(`KV value retrieved: ${key}`);
      return result;
    } catch (error) {
      console.error('Failed to get KV value:', error);
      throw new Error(`KV get failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listKeys(options: KVListOptions = {}): Promise<string[]> {
    try {
      console.log(`Listing keys with options:`, options);

      const {
        prefix = '',
        limit = 100,
        offset = 0,
        reverse = false
      } = options;

      // 0G KV has no key enumeration — cache-based only
      let keys: string[] = [];

      for (const [key] of this.kvCache) {
        if (!prefix || key.startsWith(prefix)) {
          keys.push(key);
        }
      }

      keys.sort();
      if (reverse) {
        keys.reverse();
      }

      const paginatedKeys = keys.slice(offset, offset + limit);

      console.log(`Found ${paginatedKeys.length} keys (total: ${keys.length})`);
      return paginatedKeys;
    } catch (error) {
      console.error('Failed to list keys:', error);
      throw new Error(`Key listing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async batchSet(operations: BatchKVOperation[]): Promise<string[]> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected. Use connectWallet() first.');
    }

    try {
      console.log(`Executing batch operation with ${operations.length} operations`);

      const results: string[] = [];

      // Attempt a single Batcher with all set operations
      if (this.kvOperational && this.signer && this.flowContract) {
        try {
          const nodes = await this.selectNodes();
          const batcher = new Batcher(1, nodes, this.flowContract, this.signer as any);
          const streamDataBuilder = batcher.streamDataBuilder;
          const hexStreamId = this.streamIdToHex('user_data_v1');

          for (const operation of operations) {
            if (operation.operation === 'set') {
              streamDataBuilder.set(hexStreamId, Buffer.from(operation.key, 'utf-8'), operation.value);
            }
          }

          const batchResult = await batcher.exec();
          const batchTx = String(batchResult ?? `batch_${Date.now()}`);

          for (const [index, operation] of operations.entries()) {
            if (operation.operation === 'set') {
              this.kvCache.set(operation.key, {
                value: operation.value,
                timestamp: new Date(),
                ttl: 0
              });
              results.push(`${batchTx}_op_${index}`);
            } else if (operation.operation === 'delete') {
              this.kvCache.delete(operation.key);
              results.push(`${batchTx}_del_${index}`);
            }
          }

          console.log(`Batch operation completed via Batcher: ${results.length}/${operations.length}`);
          return results;
        } catch (error) {
          console.error('Batcher exec failed, falling back to cache-only:', error);
        }
      }

      // Fallback: cache-only
      const batchId = `cache_batch_${Date.now()}`;
      for (const [index, operation] of operations.entries()) {
        if (operation.operation === 'set') {
          this.kvCache.set(operation.key, {
            value: operation.value,
            timestamp: new Date(),
            ttl: 0
          });
          results.push(`${batchId}_op_${index}`);
        } else if (operation.operation === 'delete') {
          this.kvCache.delete(operation.key);
          results.push(`${batchId}_del_${index}`);
        }
      }

      console.log(`Batch operation completed (cache-only): ${results.length}/${operations.length}`);
      return results;
    } catch (error) {
      console.error('Batch operation failed:', error);
      throw new Error(`Batch operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteKV(key: string): Promise<boolean> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected. Use connectWallet() first.');
    }

    try {
      console.log(`Deleting KV pair: ${key}`);

      // Remove from cache
      this.kvCache.delete(key);

      // Soft delete: write null to 0G KV
      if (this.kvOperational) {
        await this.kvWrite('user_data_v1', key, 'null');
      }

      console.log(`KV pair deleted: ${key}`);
      return true;
    } catch (error) {
      console.error('Failed to delete KV pair:', error);
      throw new Error(`KV delete failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // --- Stream Management ---

  async subscribeToStream(streamId: string, callback: (data: KVStreamData) => void): Promise<string> {
    try {
      console.log(`Subscribing to stream: ${streamId}`);

      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const subscription: StreamSubscription = {
        streamId,
        callback,
        active: true
      };

      this.streamSubscriptions.set(subscriptionId, subscription);

      // Poll for updates periodically
      const interval = setInterval(async () => {
        if (!subscription.active) {
          clearInterval(interval);
          return;
        }
        // In future, this could poll KvClient for version changes
      }, 30000);

      console.log(`Stream subscription created: ${subscriptionId}`);
      return subscriptionId;
    } catch (error) {
      console.error('Stream subscription failed:', error);
      throw new Error(`Stream subscription failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async unsubscribeFromStream(subscriptionId: string): Promise<boolean> {
    try {
      const subscription = this.streamSubscriptions.get(subscriptionId);

      if (subscription) {
        subscription.active = false;
        this.streamSubscriptions.delete(subscriptionId);

        console.log(`Unsubscribed from stream: ${subscription.streamId}`);
        return true;
      }

      console.log(`Subscription not found: ${subscriptionId}`);
      return false;
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      return false;
    }
  }

  getActiveSubscriptions(): StreamSubscription[] {
    return Array.from(this.streamSubscriptions.values()).filter(sub => sub.active);
  }

  async streamUpload(streamId: string, dataStream: Buffer[], chunkSize: number = 1024 * 1024): Promise<string> {
    if (!this.isWalletConnected()) {
      throw new Error('Wallet not connected. Use connectWallet() first.');
    }

    try {
      console.log(`Starting stream upload: ${streamId} (${dataStream.length} chunks)`);

      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      for (const [index, chunk] of dataStream.entries()) {
        const chunkKey = `${streamId}_chunk_${index}`;
        await this.writeWithCache(streamId, chunkKey, chunk.toString('base64'));
      }

      const streamInfo = this.streamRegistry.get(streamId);
      if (streamInfo) {
        streamInfo.lastUpdate = new Date();
        streamInfo.size = dataStream.reduce((total, chunk) => total + chunk.length, 0);
      }

      console.log(`Stream upload completed: ${uploadId}`);
      return uploadId;
    } catch (error) {
      console.error('Stream upload failed:', error);
      throw new Error(`Stream upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async cleanupOldData(retentionDays: number = 30): Promise<void> {
    try {
      console.log(`Cleaning up data older than ${retentionDays} days`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let cleanedCount = 0;
      for (const [key, cached] of this.kvCache) {
        if (cached.timestamp < cutoffDate) {
          this.kvCache.delete(key);
          cleanedCount++;
        }
      }

      console.log(`Data cleanup completed: ${cleanedCount} entries removed`);
    } catch (error) {
      console.error('Data cleanup failed:', error);
    }
  }

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
          streamUploads: true,
          realKvStorage: this.kvOperational
        },
        lastUpdated: new Date().toISOString()
      };

      return stats;
    } catch (error) {
      console.error('Failed to get enhanced storage stats:', error);
      return {};
    }
  }
}

export default ZeroGKVStorageClient;
