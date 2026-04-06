import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { ZeroGKVStorageClient } from '../kv-storage-client.js';

describe('ZeroGKVStorageClient', () => {
  let client: ZeroGKVStorageClient;

  before(() => {
    client = new ZeroGKVStorageClient();
  });

  it('should instantiate without error', () => {
    assert.ok(client);
    assert.ok(client instanceof ZeroGKVStorageClient);
  });

  it('should report wallet not connected initially', () => {
    assert.equal(client.isWalletConnected(), false);
  });

  it('should throw on storeAssistantState without wallet', async () => {
    await assert.rejects(
      () => client.storeAssistantState('user1', {} as any),
      { message: /Wallet not connected/ }
    );
  });

  it('should throw on setKV without wallet', async () => {
    await assert.rejects(
      () => client.setKV('key', 'value'),
      { message: /Wallet not connected/ }
    );
  });

  it('should throw on deleteKV without wallet', async () => {
    await assert.rejects(
      () => client.deleteKV('key'),
      { message: /Wallet not connected/ }
    );
  });

  it('should throw on batchSet without wallet', async () => {
    await assert.rejects(
      () => client.batchSet([{ key: 'k', value: Buffer.from('v'), operation: 'set' }]),
      { message: /Wallet not connected/ }
    );
  });

  it('should throw on storeConversationEntry without wallet', async () => {
    await assert.rejects(
      () => client.storeConversationEntry('user1', {
        id: '1', timestamp: new Date(), userInput: 'hi',
        assistantResponse: 'hello', success: true
      }),
      { message: /Wallet not connected/ }
    );
  });

  it('should throw on storeLearnedPattern without wallet', async () => {
    await assert.rejects(
      () => client.storeLearnedPattern({
        id: '1', pattern: 'test', category: 'deployment',
        confidence: 0.9, usageCount: 1, lastUsed: new Date(), description: 'test'
      }),
      { message: /Wallet not connected/ }
    );
  });

  it('should throw on storeContractKnowledge without wallet', async () => {
    await assert.rejects(
      () => client.storeContractKnowledge({
        address: '0x123', name: 'Test', abi: [],
        deploymentDate: new Date(), interactionCount: 0,
        gasOptimizations: [], userNotes: ''
      }),
      { message: /Wallet not connected/ }
    );
  });

  it('should throw on storeUserPreferences without wallet', async () => {
    await assert.rejects(
      () => client.storeUserPreferences('user1', {
        preferredGasPrice: 'standard', defaultNetwork: 'testnet',
        autoConfirmLowRisk: false, verboseLogging: true,
        favoriteContracts: [], customRPCEndpoints: []
      }),
      { message: /Wallet not connected/ }
    );
  });

  it('should return null for retrieveAssistantState when no data', async () => {
    const result = await client.retrieveAssistantState('nonexistent');
    assert.equal(result, null);
  });

  it('should return default preferences when no stored data', async () => {
    const prefs = await client.retrieveUserPreferences('nonexistent');
    assert.ok(prefs);
    assert.equal(prefs!.preferredGasPrice, 'standard');
    assert.equal(prefs!.defaultNetwork, '0G-Galileo-Testnet');
    assert.equal(prefs!.autoConfirmLowRisk, false);
    assert.equal(prefs!.verboseLogging, true);
    assert.ok(Array.isArray(prefs!.favoriteContracts));
    assert.ok(Array.isArray(prefs!.customRPCEndpoints));
  });

  it('should return empty array for getKV when no data', async () => {
    const result = await client.getKV('nonexistent_key');
    assert.equal(result, null);
  });

  it('should return empty list for listKeys initially', async () => {
    const keys = await client.listKeys();
    assert.ok(Array.isArray(keys));
  });

  it('should return empty array for searchPatterns', async () => {
    const patterns = await client.searchPatterns('deployment');
    assert.ok(Array.isArray(patterns));
    assert.equal(patterns.length, 0);
  });

  it('should return storage stats with correct shape', async () => {
    const stats = await client.getStorageStats();
    assert.equal(typeof stats, 'object');
    assert.ok(Array.isArray(stats.streams));
    assert.equal(typeof stats.totalStreams, 'number');
    assert.equal(stats.walletConnected, false);
    assert.equal(stats.walletAddress, null);
    assert.equal(typeof stats.network, 'string');
    assert.equal(typeof stats.lastUpdated, 'string');
  });

  it('should return enhanced stats with capabilities', async () => {
    const stats = await client.getEnhancedStorageStats();
    assert.equal(typeof stats, 'object');
    assert.ok(stats.capabilities);
    assert.equal(stats.capabilities.keyValueOperations, true);
    assert.equal(stats.capabilities.batchOperations, true);
    assert.equal(stats.capabilities.caching, true);
    assert.equal(stats.capabilities.realKvStorage, false); // no wallet connected
  });

  it('should return no active subscriptions initially', () => {
    const subs = client.getActiveSubscriptions();
    assert.ok(Array.isArray(subs));
    assert.equal(subs.length, 0);
  });

  it('should handle unsubscribe for nonexistent subscription', async () => {
    const result = await client.unsubscribeFromStream('nonexistent');
    assert.equal(result, false);
  });

  it('should export user data with correct shape', async () => {
    const data = await client.exportUserData('testuser');
    assert.equal(data.userId, 'testuser');
    assert.equal(typeof data.exportedAt, 'string');
    assert.equal(data.assistantState, null);
    assert.ok(data.preferences);
    assert.ok(data.metadata);
    assert.equal(data.metadata.version, '1.0');
  });
});
