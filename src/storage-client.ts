import { ZgFile, Indexer } from '@0glabs/0g-ts-sdk';
import { ethers } from 'ethers';
import { OG_CONFIG } from './config.js';
import fs from 'fs/promises';
import path from 'path';

export interface StorageUploadResult {
  rootHash: string;
  txHash: string;
  fileSize: number;
  fileName: string;
}

export interface StorageDownloadResult {
  success: boolean;
  filePath: string;
  verified: boolean;
}

export class OGStorageClient {
  private indexer: Indexer;
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(OG_CONFIG.rpcUrl);
    // Initializzing indexer without wallet - will be configured when wallet is connected
    this.indexer = new Indexer(OG_CONFIG.storageRpcUrl, OG_CONFIG.rpcUrl, '', '');
  }

  connectWallet(privateKey: string): void {
    this.signer = new ethers.Wallet(privateKey, this.provider);
    // Re-initializing indexer with wallet information
    this.indexer = new Indexer(OG_CONFIG.storageRpcUrl, OG_CONFIG.rpcUrl, privateKey, this.signer.address);
    console.log('🔐 Storage wallet connected:', this.signer.address);
  }

  isWalletConnected(): boolean {
    return this.signer !== null;
  }

  getWalletAddress(): string | null {
    return this.signer?.address || null;
  }

  /**
   * Upload a file to 0G Storage network
   * Based on the actual SDK implementation from starter kit
   */
  async uploadFile(filePath: string): Promise<StorageUploadResult> {
    if (!this.signer) {
      throw new Error('No wallet connected. Use connectWallet() first.');
    }

    try {
      console.log(`📤 Uploading file: ${filePath}`);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`File not found: ${filePath}`);
      }

      // Create ZgFile from file path
      const zgFile = await ZgFile.fromFilePath(filePath);
      console.log(`📊 File loaded successfully, size: ${zgFile.fileSize} bytes`);

      // Generate Merkle tree for verification
      console.log('🌳 Generating Merkle tree...');
      const [tree, treeErr] = await zgFile.merkleTree();
      if (treeErr !== null) {
        throw new Error(`Error generating Merkle tree: ${treeErr}`);
      }

      const rootHash = tree?.rootHash();
      console.log(`🔑 File Root Hash: ${rootHash}`);

      // Get file stats for size information
      const fileStats = await fs.stat(filePath);

      // Upload to network using the correct API syntax
      console.log('☁️ Uploading to 0G Storage network...');
      const [txHash, uploadErr] = await this.indexer.upload(zgFile, 0, {
        tags: '0x',
        finalityRequired: true,
        taskSize: 10,
        expectedReplica: 1,
        skipTx: false,
        fee: BigInt('0')
      });
      
      if (uploadErr !== null) {
        throw new Error(`Upload error: ${uploadErr}`);
      }

      console.log(`✅ Upload successful! TX: ${txHash}`);
      
      // Always close the file when done (this is important for resource cleanup)
      await zgFile.close();

      return {
        rootHash: rootHash!,
        txHash: txHash!,
        fileSize: fileStats.size,
        fileName: path.basename(filePath)
      };
    } catch (error) {
      console.error('❌ File upload failed:', error);
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Download a file from 0G Storage using Merkle root hash
   * Based on the actual SDK implementation
   */
  async downloadFile(rootHash: string, outputPath: string, withProof: boolean = true): Promise<StorageDownloadResult> {
    try {
      console.log(`📥 Downloading file with root hash: ${rootHash}`);
      console.log(`📁 Output path: ${outputPath}`);
      console.log(`🔍 Verification: ${withProof ? 'Enabled' : 'Disabled'}`);

      // Ensuring output directory exists
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // Download file from 0G Storage using the correct API
      const err = await this.indexer.download(rootHash, outputPath, withProof);
      
      if (err !== null) {
        throw new Error(`Download error: ${err}`);
      }

      console.log(`✅ File downloaded successfully to: ${outputPath}`);

      return {
        success: true,
        filePath: outputPath,
        verified: withProof
      };
    } catch (error) {
      console.error('❌ File download failed:', error);
      throw new Error(`File download failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Calculate Merkle root hash for a file without uploading
   * Useful for verification purposes
   */
  async calculateMerkleRoot(filePath: string): Promise<string> {
    try {
      console.log(`🧮 Calculating Merkle root for: ${filePath}`);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`File not found: ${filePath}`);
      }

      // Create ZgFile from file path
      const zgFile = await ZgFile.fromFilePath(filePath);

      // Generate Merkle tree
      const [tree, treeErr] = await zgFile.merkleTree();
      if (treeErr !== null) {
        throw new Error(`Merkle tree calculation error: ${treeErr}`);
      }

      const rootHash = tree?.rootHash();
      
      // Always close the file when done (important for resource cleanup)
      await zgFile.close();

      console.log(`🔑 Merkle root calculated: ${rootHash}`);
      return rootHash!;
    } catch (error) {
      console.error('❌ Merkle root calculation failed:', error);
      throw new Error(`Merkle root calculation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Upload from buffer/memory instead of file path
   * Useful for generated content or data from memory
   */
  async uploadFromBuffer(buffer: Buffer, fileName: string): Promise<StorageUploadResult> {
    if (!this.signer) {
      throw new Error('No wallet connected. Use connectWallet() first.');
    }

    try {
      console.log(`📤 Uploading from buffer: ${fileName} (${buffer.length} bytes)`);

      // For buffer upload, we need to create a temporary file or use a different approach
      // Since the SDK expects a file path, let's create a temporary file
      const tempDir = path.join(process.cwd(), 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      const tempFilePath = path.join(tempDir, fileName);
      
      // Write buffer to temporary file
      await fs.writeFile(tempFilePath, buffer);

      // Upload the temporary file
      const result = await this.uploadFile(tempFilePath);
      
      // Clean up temporary file
      await fs.unlink(tempFilePath).catch(() => {}); // Ignore cleanup errors

      return result;
    } catch (error) {
      console.error('❌ Buffer upload failed:', error);
      throw new Error(`Buffer upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get file information using Merkle root
   */
  async getFileInfo(rootHash: string): Promise<{
    exists: boolean;
    size?: number;
  }> {
    try {
      console.log(`ℹ️ Getting file info for root hash: ${rootHash}`);
      
      // For now, we'll try to download with a test path to check existence
      // This is a simplified implementation - in production we will query the indexer
      const testPath = path.join(process.cwd(), 'temp', 'test_download');
      
      try {
        await this.indexer.download(rootHash, testPath, false);
        // If download succeeds, file exists
        await fs.unlink(testPath).catch(() => {}); // Clean up test file
        return {
          exists: true,
          size: 0 // Would need to get actual size from indexer
        };
      } catch (downloadErr) {
        return {
          exists: false
        };
      }
    } catch (error) {
      console.error('❌ Failed to get file info:', error);
      return {
        exists: false
      };
    }
  }

  /**
   * List available storage nodes
   */
  async getStorageNodes(): Promise<any[]> {
    try {
      console.log('🌐 Getting available storage nodes...');
      
      // The Indexer should have a method to get storage nodes
      // For now, we return empty array as the exact method name needs to be checked
      console.log('ℹ️ Storage node listing not yet implemented - SDK method needs verification');
      return [];
    } catch (error) {
      console.error('❌ Failed to get storage nodes:', error);
      throw new Error(`Failed to get storage nodes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Disconnect and cleanup resources
   */
  async disconnect(): Promise<void> {
    try {
      // Clean up any remaining resources
      this.signer = null;
      console.log('🔌 Storage client disconnected');
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
    }
  }
}

export default OGStorageClient;
