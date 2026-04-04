import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { OGStorageClient } from '../storage-client.js';

describe('OGStorageClient', () => {
  let client: OGStorageClient;

  before(() => {
    client = new OGStorageClient();
  });

  it('should instantiate without error', () => {
    assert.ok(client);
    assert.ok(client instanceof OGStorageClient);
  });

  it('should report wallet not connected initially', () => {
    assert.equal(client.isWalletConnected(), false);
  });

  it('should return null wallet address when not connected', () => {
    assert.equal(client.getWalletAddress(), null);
  });

  it('should throw on uploadFile without wallet', async () => {
    await assert.rejects(
      () => client.uploadFile('/some/path'),
      { message: /No wallet connected/ }
    );
  });

  it('should throw on uploadFromBuffer without wallet', async () => {
    await assert.rejects(
      () => client.uploadFromBuffer(Buffer.from('test'), 'test.txt'),
      { message: /No wallet connected/ }
    );
  });

  it('should return streaming stats with correct shape', () => {
    const stats = client.getStreamingStats();
    assert.equal(typeof stats, 'object');
    assert.equal(typeof stats.maxChunkSize, 'number');
    assert.equal(typeof stats.minChunkSize, 'number');
    assert.equal(typeof stats.defaultChunkSize, 'number');
    assert.equal(typeof stats.maxConcurrentStreams, 'number');
    assert.ok(Array.isArray(stats.supportedFeatures));
    assert.equal(stats.walletConnected, false);
    assert.equal(stats.walletAddress, null);
  });

  it('should throw on calculateMerkleRoot for non-existent file', async () => {
    await assert.rejects(
      () => client.calculateMerkleRoot('/nonexistent/file.txt'),
      { message: /File not found/ }
    );
  });
});

describe('OGStorageClient - Known Stubs', () => {
  let client: OGStorageClient;

  before(() => {
    client = new OGStorageClient();
  });

  it('getStorageNodes() returns empty array (stubbed, not implemented)', async () => {
    const nodes = await client.getStorageNodes();
    assert.deepStrictEqual(nodes, []);
  });

  // Documenting simulated features — these are not real streaming implementations.
  // streamUpload reads the whole file into chunks in memory, recombines them, and calls uploadFromBuffer.
  // streamDownload downloads the entire file first, then splits it into chunks locally.
  // See storage-client.ts lines 310-437 for details.
});
