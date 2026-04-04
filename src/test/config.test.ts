import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OG_CONFIG } from '../config.js';

describe('OG_CONFIG', () => {
  it('should be a non-null object', () => {
    assert.ok(OG_CONFIG);
    assert.equal(typeof OG_CONFIG, 'object');
  });

  it('should have chainId 16602 (Galileo Testnet)', () => {
    assert.equal(OG_CONFIG.chainId, 16602);
  });

  it('should have rpcUrl as an https string', () => {
    assert.equal(typeof OG_CONFIG.rpcUrl, 'string');
    assert.ok(OG_CONFIG.rpcUrl.startsWith('https://'), `rpcUrl should start with https://, got: ${OG_CONFIG.rpcUrl}`);
  });

  it('should have storageRpcUrl as a string', () => {
    assert.equal(typeof OG_CONFIG.storageRpcUrl, 'string');
    assert.ok(OG_CONFIG.storageRpcUrl.length > 0);
  });

  it('should have correct static URLs', () => {
    assert.equal(OG_CONFIG.explorerUrl, 'https://chainscan-galileo.0g.ai');
    assert.equal(OG_CONFIG.faucetUrl, 'https://faucet.0g.ai');
  });

  it('should have networkName 0G-Galileo-Testnet', () => {
    assert.equal(OG_CONFIG.networkName, '0G-Galileo-Testnet');
  });

  it('should have correct nativeCurrency shape', () => {
    assert.equal(OG_CONFIG.nativeCurrency.name, 'OG');
    assert.equal(OG_CONFIG.nativeCurrency.symbol, 'OG');
    assert.equal(OG_CONFIG.nativeCurrency.decimals, 18);
  });

  it('should have nodeEnv as a string', () => {
    assert.equal(typeof OG_CONFIG.nodeEnv, 'string');
  });

  it('should have debug as a boolean', () => {
    assert.equal(typeof OG_CONFIG.debug, 'boolean');
  });
});
