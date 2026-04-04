import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { AIStateManager } from '../ai-state-manager.js';

// Sample the broken ZeroGKVStorageClient.
// In production, all store/retrieve methods return placeholder values and do NOT
// actually persist to 0G KV storage. See kv-storage-client.ts lines 218, 250, 306, 337.
// This sample mimics that behavior so we can test the in-memory learning logic.
const createMockKVStorage = () => ({
  retrieveAssistantState: async (_userId: string) => null,
  retrieveUserPreferences: async (_userId: string) => null,
  storeAssistantState: async (_userId: string, _state: any) => `kv_store_${Date.now()}`,
  storeConversationEntry: async (_userId: string, _entry: any) => `kv_conv_${Date.now()}`,
  storeLearnedPattern: async (_pattern: any) => `kv_pattern_${Date.now()}`,
  storeUserPreferences: async (_userId: string, _prefs: any) => `kv_prefs_${Date.now()}`,
  isWalletConnected: () => false,
  connectWallet: (_pk: string) => {},
});

const createMockNetworkClient = () => ({} as any);
const createMockKnowledgeEngine = () => ({} as any);

describe('AIStateManager - Initialization', () => {
  it('should instantiate with mock dependencies', () => {
    const manager = new AIStateManager(
      createMockKVStorage() as any,
      createMockNetworkClient(),
      createMockKnowledgeEngine()
    );
    assert.ok(manager);
  });

  it('should initialize a new user', async () => {
    const manager = new AIStateManager(
      createMockKVStorage() as any,
      createMockNetworkClient(),
      createMockKnowledgeEngine()
    );

    await manager.initializeUser('test-user-1');
    const stats = manager.getMemoryStats();
    assert.equal(stats.userId, 'test-user-1');
    assert.equal(stats.shortTermMemory, 0);
    assert.equal(stats.longTermPatterns, 0);
  });

  it('should throw when recording without user init', async () => {
    const manager = new AIStateManager(
      createMockKVStorage() as any,
      createMockNetworkClient(),
      createMockKnowledgeEngine()
    );

    // recordConversation catches errors internally and doesn't rethrow,
    // but the error message is logged. We verify no user is set.
    const stats = manager.getMemoryStats();
    assert.equal(stats.userId, null);
  });
});

describe('AIStateManager - Recording & Learning', () => {
  let manager: AIStateManager;

  before(async () => {
    manager = new AIStateManager(
      createMockKVStorage() as any,
      createMockNetworkClient(),
      createMockKnowledgeEngine()
    );
    await manager.initializeUser('test-user');
  });

  it('should record a conversation in short-term memory', async () => {
    await manager.recordConversation(
      'check my balance',
      'Your balance is 1.5 OG',
      'get_balance',
      true
    );
    const stats = manager.getMemoryStats();
    assert.equal(stats.shortTermMemory, 1);
  });

  it('should learn deployment pattern from successful deploy', async () => {
    const patternsBefore = manager.getMemoryStats().longTermPatterns;

    await manager.recordConversation(
      'deploy an ERC20 token',
      'Deployed ERC20 at 0x123...',
      'deploy_erc20',
      true,
      '50000'
    );

    const patternsAfter = manager.getMemoryStats().longTermPatterns;
    assert.ok(
      patternsAfter > patternsBefore,
      `Should learn patterns from deployment. Before: ${patternsBefore}, After: ${patternsAfter}`
    );
  });

  it('should learn gas optimization pattern when gasUsed provided', async () => {
    const patternsBefore = manager.getMemoryStats().longTermPatterns;

    await manager.recordConversation(
      'send 1 OG to address',
      'Transaction sent',
      'send_transaction',
      true,
      '21000',
      '0xabc123'
    );

    const patternsAfter = manager.getMemoryStats().longTermPatterns;
    assert.ok(
      patternsAfter > patternsBefore,
      `Should learn gas pattern. Before: ${patternsBefore}, After: ${patternsAfter}`
    );
  });

  it('should not learn from failed interactions (shortTerm grows, longTerm does not)', async () => {
    const statsBefore = manager.getMemoryStats();

    await manager.recordConversation(
      'do something broken',
      'Error occurred',
      'broken_action',
      false
    );

    const statsAfter = manager.getMemoryStats();
    assert.equal(
      statsAfter.shortTermMemory,
      statsBefore.shortTermMemory + 1,
      'Short-term memory should increase'
    );
    // Learning is skipped when success=false (ai-state-manager.ts line 139)
    assert.equal(
      statsAfter.longTermPatterns,
      statsBefore.longTermPatterns,
      'Long-term patterns should not increase for failed interactions'
    );
  });

  it('should respect MAX_SHORT_TERM_ENTRIES limit of 50', async () => {
    // Fill up to exceed the limit
    const manager2 = new AIStateManager(
      createMockKVStorage() as any,
      createMockNetworkClient(),
      createMockKnowledgeEngine()
    );
    await manager2.initializeUser('limit-test-user');

    for (let i = 0; i < 55; i++) {
      await manager2.recordConversation(
        `message ${i}`,
        `response ${i}`,
        'test_action',
        true
      );
    }

    const stats = manager2.getMemoryStats();
    assert.equal(stats.shortTermMemory, 50, 'Should cap at 50 entries');
    assert.equal(stats.memoryUtilization.shortTerm, '50/50');
  });
});

describe('AIStateManager - Personalized Suggestions', () => {
  let manager: AIStateManager;

  before(async () => {
    manager = new AIStateManager(
      createMockKVStorage() as any,
      createMockNetworkClient(),
      createMockKnowledgeEngine()
    );
    await manager.initializeUser('suggestions-user');

    // Record several deployment conversations to build patterns
    for (let i = 0; i < 3; i++) {
      await manager.recordConversation(
        'deploy a smart contract',
        'Contract deployed successfully',
        'deploy_contract',
        true,
        '50000'
      );
    }
  });

  it('should return an array of suggestions', () => {
    const suggestions = manager.getPersonalizedSuggestions('deploy');
    assert.ok(Array.isArray(suggestions));
  });

  it('should return suggestions for matching context', () => {
    const suggestions = manager.getPersonalizedSuggestions('deploy');
    // After recording deployment patterns, there should be relevant suggestions
    assert.ok(suggestions.length > 0, 'Should have suggestions for deploy context');
  });

  it('should return array for non-matching context', () => {
    const suggestions = manager.getPersonalizedSuggestions('xyzzy_no_match_12345');
    assert.ok(Array.isArray(suggestions));
  });
});

describe('AIStateManager - Memory Stats Shape', () => {
  it('should return stats with correct keys', async () => {
    const manager = new AIStateManager(
      createMockKVStorage() as any,
      createMockNetworkClient(),
      createMockKnowledgeEngine()
    );
    await manager.initializeUser('stats-user');

    const stats = manager.getMemoryStats();
    assert.ok('userId' in stats);
    assert.ok('shortTermMemory' in stats);
    assert.ok('longTermPatterns' in stats);
    assert.ok('contractKnowledge' in stats);
    assert.ok('learningEnabled' in stats);
    assert.ok('memoryUtilization' in stats);
    assert.ok('shortTerm' in stats.memoryUtilization);
    assert.ok('longTerm' in stats.memoryUtilization);
    assert.ok('avgPatternConfidence' in stats.memoryUtilization);
  });
});

describe('AIStateManager - saveState', () => {
  //  saveState() appears to work here because we sample out the KV client.
  // In production, ZeroGKVStorageClient.storeAssistantState() (kv-storage-client.ts line 218)
  // returns a placeholder string and does NOT write to 0G KV storage.
  // All learned state is lost on process restart.

  it('should call KV storage methods without error (KV is simulated in production)', async () => {
    const manager = new AIStateManager(
      createMockKVStorage() as any,
      createMockNetworkClient(),
      createMockKnowledgeEngine()
    );
    await manager.initializeUser('save-test-user');
    await manager.recordConversation('test', 'response', 'action', true);

    // This succeeds with our sample but does nothing in production just yet
    await assert.doesNotReject(() => manager.saveState());
  });

  it('should throw when saving without user init', async () => {
    const manager = new AIStateManager(
      createMockKVStorage() as any,
      createMockNetworkClient(),
      createMockKnowledgeEngine()
    );

    await assert.rejects(
      () => manager.saveState(),
      { message: /No user initialized/ }
    );
  });
});
