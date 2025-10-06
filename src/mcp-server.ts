#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { OGNetworkClient } from './network-client.js';
import { OG_CONFIG } from './config.js';
import OGStorageClient from './storage-client.js';

class OGMCPServer {
  private server: Server;
  private networkClient: OGNetworkClient;
  private storageClient: OGStorageClient;
  private isWalletConnected: boolean = false;

  constructor() {
    this.server = new Server(
      {
        name: '0g-voice-assistant-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.networkClient = new OGNetworkClient();
    this.storageClient = new OGStorageClient();
    this.setupToolHandlers();
    console.error('🚀 0G Voice Assistant MCP Server initialized');
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'connect_to_0g',
          description: 'Connect to 0G Galileo Testnet',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_balance',
          description: 'Get account balance on 0G network',
          inputSchema: {
            type: 'object',
            properties: {
              address: {
                type: 'string',
                description: '0G address to check balance for',
              },
            },
            required: ['address'],
          },
        },
        {
          name: 'get_network_info',
          description: 'Get current 0G network information',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'connect_wallet',
          description: 'Connect a wallet using private key for transactions',
          inputSchema: {
            type: 'object',
            properties: {
              privateKey: {
                type: 'string',
                description: 'Private key for wallet connection (use with caution)',
              },
            },
            required: ['privateKey'],
          },
        },
        {
          name: 'get_wallet_info',
          description: 'Get information about the connected wallet',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'send_transaction',
          description: 'Send a transaction on 0G network',
          inputSchema: {
            type: 'object',
            properties: {
              to: {
                type: 'string',
                description: 'Recipient address',
              },
              value: {
                type: 'string',
                description: 'Amount to send in A0GI',
              },
            },
            required: ['to', 'value'],
          },
        },
        {
          name: 'deploy_contract',
          description: 'Deploy a smart contract to 0G network',
          inputSchema: {
            type: 'object',
            properties: {
              bytecode: {
                type: 'string',
                description: 'Contract bytecode as hex string (with 0x prefix)',
              },
              constructorArgs: {
                type: 'array',
                description: 'Constructor arguments for contract deployment',
                items: {},
              },
            },
            required: ['bytecode'],
          },
        },
        {
          name: 'get_transaction_status',
          description: 'Get the status of a transaction',
          inputSchema: {
            type: 'object',
            properties: {
              txHash: {
                type: 'string',
                description: 'Transaction hash to check',
              },
            },
            required: ['txHash'],
          },
        },
        {
          name: 'estimate_gas',
          description: 'Estimate gas cost for a transaction',
          inputSchema: {
            type: 'object',
            properties: {
              to: {
                type: 'string',
                description: 'Recipient address',
              },
              value: {
                type: 'string',
                description: 'Amount to send in A0GI',
              },
              data: {
                type: 'string',
                description: 'Optional transaction data (hex string)',
              },
            },
            required: ['to', 'value'],
          },
        },
        {
          name: 'get_gas_price',
          description: 'Get current gas price',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        // 0G Storage Tools
        {
          name: 'upload_file_to_storage',
          description: 'Upload a file to 0G Storage network',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the file to upload',
              },
            },
            required: ['filePath'],
          },
        },
        {
          name: 'download_file_from_storage',
          description: 'Download a file from 0G Storage using Merkle root hash',
          inputSchema: {
            type: 'object',
            properties: {
              rootHash: {
                type: 'string',
                description: 'Merkle root hash of the file to download',
              },
              outputPath: {
                type: 'string',
                description: 'Local path where to save the downloaded file',
              },
            },
            required: ['rootHash', 'outputPath'],
          },
        },
        {
          name: 'calculate_merkle_root',
          description: 'Calculate Merkle root hash for a file without uploading',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the file',
              },
            },
            required: ['filePath'],
          },
        },
        {
          name: 'get_file_info',
          description: 'Get file information using Merkle root hash',
          inputSchema: {
            type: 'object',
            properties: {
              rootHash: {
                type: 'string',
                description: 'Merkle root hash of the file',
              },
            },
            required: ['rootHash'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'connect_to_0g':
            return await this.handleConnect();
          
          case 'get_balance':
            return await this.handleGetBalance(args);
          
          case 'get_network_info':
            return await this.handleGetNetworkInfo();
          
          case 'connect_wallet':
            return await this.handleConnectWallet(args);
          
          case 'get_wallet_info':
            return await this.handleGetWalletInfo();
          
          case 'send_transaction':
            return await this.handleSendTransaction(args);
          
          case 'deploy_contract':
            return await this.handleDeployContract(args);
          
          case 'get_transaction_status':
            return await this.handleGetTransactionStatus(args);
          
          case 'estimate_gas':
            return await this.handleEstimateGas(args);
          
          case 'get_gas_price':
            return await this.handleGetGasPrice();
          
          // 0G Storage Tools
          case 'upload_file_to_storage':
            return await this.handleUploadFileToStorage(args);
          
          case 'download_file_from_storage':
            return await this.handleDownloadFileFromStorage(args);
          
          case 'calculate_merkle_root':
            return await this.handleCalculateMerkleRoot(args);
          
          case 'get_file_info':
            return await this.handleGetFileInfo(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleConnect() {
    const connected = await this.networkClient.connect();
    
    return {
      content: [
        {
          type: 'text',
          text: connected 
            ? '✅ Successfully connected to 0G Galileo Testnet!' 
            : '❌ Failed to connect to 0G network',
        },
      ],
    };
  }

  private async handleGetBalance(args: any) {
    const { address } = args;
    const balance = await this.networkClient.getBalance(address);
    
    return {
      content: [
        {
          type: 'text',
          text: `💰 Balance for ${address}: ${balance} A0GI`,
        },
      ],
    };
  }

  private async handleGetNetworkInfo() {
    const networkInfo = await this.networkClient.getNetworkInfo();
    
    return {
      content: [
        {
          type: 'text',
          text: `📊 0G Network Information:\n${JSON.stringify(networkInfo, null, 2)}`,
        },
      ],
    };
  }

  private async handleConnectWallet(args: any) {
    const { privateKey } = args;
    
    try {
      this.networkClient.connectWallet(privateKey);
      this.storageClient.connectWallet(privateKey); // Also connect storage client
      this.isWalletConnected = true;
      const walletAddress = this.networkClient.getWalletAddress();
      
      console.error(`🔐 Wallet connected: ${walletAddress}`);
      
      return {
        content: [
          {
            type: 'text',
            text: `🔐 Wallet connected successfully!\nAddress: ${walletAddress}\n⚠️  Warning: Private key is stored in memory. Use only for testing.\n✅ Both network and storage clients are now connected.`,
          },
        ],
      };
    } catch (error) {
      this.isWalletConnected = false;
      throw new Error(`Failed to connect wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGetWalletInfo() {
    if (!this.isWalletConnected) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ No wallet connected. Use connect_wallet first.',
          },
        ],
      };
    }

    const walletAddress = this.networkClient.getWalletAddress();
    const balance = await this.networkClient.getBalance(walletAddress!);
    
    return {
      content: [
        {
          type: 'text',
          text: `👛 Wallet Information:\nAddress: ${walletAddress}\nBalance: ${balance} A0GI\nNetwork: ${OG_CONFIG.networkName}`,
        },
      ],
    };
  }

  private async handleSendTransaction(args: any) {
    if (!this.isWalletConnected) {
      throw new Error('No wallet connected. Use connect_wallet first.');
    }

    const { to, value } = args;
    
    try {
      console.error(`💸 Sending transaction: ${value} A0GI to ${to}`);
      const txHash = await this.networkClient.sendTransaction(to, value);
      
      console.error(`✅ Transaction sent: ${txHash}`);
      
      return {
        content: [
          {
            type: 'text',
            text: `💸 Transaction sent successfully!\nHash: ${txHash}\nTo: ${to}\nValue: ${value} A0GI\nStatus: Pending confirmation...`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Transaction failed: ${error}`);
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleDeployContract(args: any) {
    if (!this.isWalletConnected) {
      throw new Error('No wallet connected. Use connect_wallet first.');
    }

    const { bytecode, constructorArgs = [] } = args;
    
    try {
      console.error(`🚀 Deploying contract with bytecode length: ${bytecode.length}`);
      
      const contractAddress = await this.networkClient.deployContract(bytecode, constructorArgs);
      
      console.error(`✅ Contract deployed at: ${contractAddress}`);
      
      return {
        content: [
          {
            type: 'text',
            text: `🚀 Contract deployed successfully!\nAddress: ${contractAddress}\nBytecode: ${bytecode.substring(0, 50)}...${bytecode.length > 50 ? '...' : ''}\nConstructor Args: ${JSON.stringify(constructorArgs)}`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Contract deployment failed: ${error}`);
      throw new Error(`Contract deployment failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGetTransactionStatus(args: any) {
    const { txHash } = args;
    
    try {
      console.error(`📊 Checking transaction status: ${txHash}`);
      const status = await this.networkClient.getTransactionStatus(txHash);
      
      return {
        content: [
          {
            type: 'text',
            text: `📊 Transaction Status:\nHash: ${status.hash}\nFrom: ${status.from}\nTo: ${status.to}\nValue: ${status.value} A0GI\nStatus: ${status.status}\nBlock: ${status.blockNumber}\nConfirmations: ${status.confirmations}\nGas Used: ${status.gasUsed}`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Failed to get transaction status: ${error}`);
      throw new Error(`Failed to get transaction status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleEstimateGas(args: any) {
    const { to, value, data } = args;
    
    try {
      console.error(`⛽ Estimating gas for transaction to ${to}`);
      const gasEstimate = await this.networkClient.estimateGas(to, value, data);
      const gasPrice = await this.networkClient.getGasPrice();
      
      return {
        content: [
          {
            type: 'text',
            text: `⛽ Gas Estimate:\nGas Limit: ${gasEstimate}\nGas Price: ${gasPrice} gwei\nEstimated Cost: ${(parseFloat(gasEstimate) * parseFloat(gasPrice) / 1e9).toFixed(8)} A0GI`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Failed to estimate gas: ${error}`);
      throw new Error(`Failed to estimate gas: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGetGasPrice() {
    try {
      console.error('⛽ Getting current gas price');
      const gasPrice = await this.networkClient.getGasPrice();
      
      return {
        content: [
          {
            type: 'text',
            text: `⛽ Current Gas Price: ${gasPrice} gwei`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Failed to get gas price: ${error}`);
      throw new Error(`Failed to get gas price: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 0G Storage Handlers
  private async handleUploadFileToStorage(args: any) {
    if (!this.isWalletConnected) {
      throw new Error('No wallet connected. Use connect_wallet first for storage operations.');
    }

    const { filePath } = args;
    
    try {
      console.error(`📤 Uploading file to 0G Storage: ${filePath}`);
      
      // Connect storage wallet using the same private key as network client
      if (!this.storageClient.isWalletConnected()) {
        // Get the private key from network client (we need to store it)
        throw new Error('Storage client not connected. Please connect wallet first.');
      }
      
      const result = await this.storageClient.uploadFile(filePath);
      
      console.error(`✅ File uploaded successfully! Root hash: ${result.rootHash}`);
      
      return {
        content: [
          {
            type: 'text',
            text: `📤 File uploaded to 0G Storage successfully!\nRoot Hash: ${result.rootHash}\nTransaction Hash: ${result.txHash}\nFile Size: ${result.fileSize} bytes\nFile Name: ${result.fileName}\n\n💡 Save this root hash to download the file later!`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ File upload failed: ${error}`);
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleDownloadFileFromStorage(args: any) {
    const { rootHash, outputPath } = args;
    
    try {
      console.error(`📥 Downloading file from 0G Storage: ${rootHash}`);
      
      const result = await this.storageClient.downloadFile(rootHash, outputPath);
      
      console.error(`✅ File downloaded successfully to: ${result.filePath}`);
      
      return {
        content: [
          {
            type: 'text',
            text: `📥 File downloaded from 0G Storage successfully!\nRoot Hash: ${rootHash}\nOutput Path: ${result.filePath}\nVerification: ${result.verified ? 'Enabled' : 'Disabled'}\n\n✅ Download completed!`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ File download failed: ${error}`);
      throw new Error(`File download failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleCalculateMerkleRoot(args: any) {
    const { filePath } = args;
    
    try {
      console.error(`🧮 Calculating Merkle root for file: ${filePath}`);
      
      const rootHash = await this.storageClient.calculateMerkleRoot(filePath);
      
      console.error(`✅ Merkle root calculated: ${rootHash}`);
      
      return {
        content: [
          {
            type: 'text',
            text: `🧮 Merkle root calculated successfully!\nFile Path: ${filePath}\nRoot Hash: ${rootHash}\n\n💡 This root hash can be used to verify file integrity or download the file from 0G Storage.`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Merkle root calculation failed: ${error}`);
      throw new Error(`Merkle root calculation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGetFileInfo(args: any) {
    const { rootHash } = args;
    
    try {
      console.error(`ℹ️ Getting file info for root hash: ${rootHash}`);
      
      const fileInfo = await this.storageClient.getFileInfo(rootHash);
      
      if (fileInfo.exists) {
        return {
          content: [
            {
              type: 'text',
              text: `ℹ️ File Information:\nRoot Hash: ${rootHash}\nStatus: File exists in 0G Storage\nSize: ${fileInfo.size || 'Unknown'} bytes\n\n✅ File is available for download!`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `ℹ️ File Information:\nRoot Hash: ${rootHash}\nStatus: File not found in 0G Storage\n\n❌ File with this root hash does not exist or is not accessible.`,
            },
          ],
        };
      }
    } catch (error) {
      console.error(`❌ Failed to get file info: ${error}`);
      throw new Error(`Failed to get file info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('0G MCP server running on stdio');
  }
}

// Start the server
const server = new OGMCPServer();
server.run().catch(console.error);
