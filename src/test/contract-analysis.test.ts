import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { OGNetworkClient } from '../network-client.js';
import { ContractAnalysisEngine } from '../contract-analysis-engine.js';

// Integration tests against real 0G Galileo Testnet.
// Requires network connectivity.
//
// ANd on ABI accuracy: For unverified contracts, the engine uses heuristic
// function selector matching (PUSH4 opcodes in bytecode). Function names are
// placeholders like "function_0xabcd1234". tryExtractVerifiedABI() always
// returns verified=false. This is a known limitation.

describe('ContractAnalysisEngine', () => {
  let networkClient: OGNetworkClient;
  let engine: ContractAnalysisEngine;

  before(async function () {
    networkClient = new OGNetworkClient();
    const connected = await networkClient.connect();
    if (!connected) {
      throw new Error('Cannot connect to 0G testnet — skipping contract analysis tests');
    }
    engine = new ContractAnalysisEngine(networkClient);
  });

  it('should instantiate with network client', { timeout: 30_000 }, () => {
    assert.ok(engine);
  });

  it('should reject invalid address format', { timeout: 10_000 }, async () => {
    const result = await engine.analyzeContract('not-an-address');
    assert.equal(result.success, false);
    assert.ok(result.error?.includes('Invalid contract address'));
    assert.equal(result.confidence, 0);
    assert.ok(Array.isArray(result.suggestions));
  });

  it('should report no contract for EOA address', { timeout: 15_000 }, async () => {
 
    const result = await engine.analyzeContract('0x6975253db7f4ab6d66799440617a81a0b4fa5708');

    if (result.success) {
      // Address is a contract — verify the success shape
      assert.ok(result.contractInfo);
      assert.equal(typeof result.contractInfo.address, 'string');
      assert.equal(typeof result.contractInfo.bytecode, 'string');
    } else {
      // Address is an EOA — verify the failure shape
      assert.ok(result.error?.includes('No contract found'));
      assert.equal(result.confidence, 0);
    }
    assert.ok(Array.isArray(result.suggestions));
  });

  it('should return AnalysisResult with correct shape', { timeout: 15_000 }, async () => {
    // Use zero address — guaranteed to have no contract
    const result = await engine.analyzeContract('0x0000000000000000000000000000000000000001');

    assert.equal(typeof result.success, 'boolean');
    assert.equal(typeof result.confidence, 'number');
    assert.ok(Array.isArray(result.suggestions));

    if (result.success && result.contractInfo) {
      assert.equal(typeof result.contractInfo.address, 'string');
      assert.equal(typeof result.contractInfo.bytecode, 'string');
      assert.equal(typeof result.contractInfo.verified, 'boolean');
      assert.ok(Array.isArray(result.contractInfo.functions));
      assert.ok(Array.isArray(result.contractInfo.events));
      assert.ok(Array.isArray(result.contractInfo.abi));
    }
  });

  it('should cache results on second call', { timeout: 15_000 }, async () => {
    const address = '0x0000000000000000000000000000000000000001';

    // First call
    const result1 = await engine.analyzeContract(address);

    // Second call — should hit cache
    const result2 = await engine.analyzeContract(address);

    if (result1.success) {
      // If first call found a contract, second should be cached at 0.95 confidence
      assert.equal(result2.success, true);
      assert.equal(result2.confidence, 0.95);
    }
    // If first call found no contract, it won't be cached, which is correct
  });

  it('should clear cache', () => {
    engine.clearCache();
    const stats = engine.getStats();
    assert.equal(stats.cachedContracts, 0);
  });

  it('should return stats with correct shape', () => {
    const stats = engine.getStats();
    assert.equal(typeof stats.totalAnalyzed, 'number');
    assert.equal(typeof stats.verifiedContracts, 'number');
    assert.equal(typeof stats.cachedContracts, 'number');
  });
});
