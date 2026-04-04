import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { OGNetworkClient } from '../network-client.js';

// Integration tests against  0G Galileo Testnet.
// These require network connectivity. If the testnet is down, tests will fail honestly.

describe('OGNetworkClient', () => {
  let client: OGNetworkClient;

  before(() => {
    client = new OGNetworkClient();
  });

  it('should instantiate without error', () => {
    assert.ok(client);
    assert.ok(client instanceof OGNetworkClient);
  });

  it('should connect to 0G Galileo Testnet', { timeout: 30_000 }, async () => {
    const connected = await client.connect();
    assert.equal(connected, true, 'connect() should return true when testnet is reachable');
  });

  it('should report isConnected after successful connect', { timeout: 10_000 }, async () => {
    const connected = await client.isConnected();
    assert.equal(connected, true);
  });

  it('should return network info with correct shape', { timeout: 10_000 }, async () => {
    const info = await client.getNetworkInfo();

    assert.equal(typeof info.blockNumber, 'number');
    assert.ok(info.blockNumber > 0, `blockNumber should be > 0, got ${info.blockNumber}`);
    assert.equal(typeof info.gasPrice, 'string');
    assert.equal(info.network, '0G-Galileo-Testnet');
    assert.equal(info.chainId, 16602);
  });

  it('should get balance for an address without throwing', { timeout: 10_000 }, async () => {
    // Using a known testnet address
    const balance = await client.getBalance('0x6975253db7f4ab6d66799440617a81a0b4fa5708');
    assert.equal(typeof balance, 'string');
    assert.ok(parseFloat(balance) >= 0, `balance should be >= 0, got ${balance}`);
  });

  it('should return a provider instance', () => {
    const provider = client.getProvider();
    assert.ok(provider);
    assert.equal(typeof provider.getBlockNumber, 'function');
  });

  it('should return null wallet address when no wallet connected', () => {
    assert.equal(client.getWalletAddress(), null);
  });

  it('should return null signer when no wallet connected', () => {
    assert.equal(client.getSigner(), null);
  });

  it('should throw when sending transaction without wallet', async () => {
    await assert.rejects(
      () => client.sendTransaction('0x0000000000000000000000000000000000000001', '0.001'),
      { message: /No wallet connected/ }
    );
  });

  it('should throw when deploying contract without wallet', async () => {
    await assert.rejects(
      () => client.deployContract('0x'),
      { message: /No wallet connected/ }
    );
  });
});
