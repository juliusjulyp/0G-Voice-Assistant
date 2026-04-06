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
import ZeroGKVStorageClient from './kv-storage-client.js';
import AIStateManager from './ai-state-manager.js';
import KnowledgeIngestionEngine from './knowledge-ingestion.js';
import ContractAnalysisEngine from './contract-analysis-engine.js';
import DynamicToolGenerator from './dynamic-tool-generator.js';
import ContractExplorer from './contract-explorer.js';
import ContractWorkflowEngine from './contract-workflow-engine.js';
import ContractTestingFramework from './contract-testing-framework.js';

class OGMCPServer {
  private server: Server;
  private networkClient: OGNetworkClient;
  private storageClient: OGStorageClient;
  private kvStorageClient: ZeroGKVStorageClient;
  private aiStateManager: AIStateManager;
  private knowledgeEngine: KnowledgeIngestionEngine;
  private contractAnalysisEngine: ContractAnalysisEngine;
  private dynamicToolGenerator: DynamicToolGenerator;
  private contractExplorer: ContractExplorer;
  private workflowEngine: ContractWorkflowEngine;
  private testingFramework: ContractTestingFramework;
  private isWalletConnected: boolean = false;
  private currentUserId: string = 'default_user';

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
    this.kvStorageClient = new ZeroGKVStorageClient();
    this.knowledgeEngine = new KnowledgeIngestionEngine(OG_CONFIG.rpcUrl);
    this.aiStateManager = new AIStateManager(
      this.kvStorageClient,
      this.networkClient,
      this.knowledgeEngine
    );
    
    // Initialize contract intelligence components
    this.contractAnalysisEngine = new ContractAnalysisEngine(this.networkClient);
    this.dynamicToolGenerator = new DynamicToolGenerator(this.networkClient);
    this.contractExplorer = new ContractExplorer(this.networkClient);
    this.workflowEngine = new ContractWorkflowEngine(this.networkClient, this.contractExplorer);
    this.testingFramework = new ContractTestingFramework(this.networkClient, this.contractExplorer);
    
    this.setupToolHandlers();
    console.error('🚀 0G Voice Assistant MCP Server with Advanced Contract Intelligence initialized');
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
        // 0G KV Storage & AI Learning Tools
        {
          name: 'initialize_ai_user',
          description: 'Initialize AI assistant state for a user',
          inputSchema: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'Unique identifier for the user',
              },
            },
            required: ['userId'],
          },
        },
        {
          name: 'record_conversation',
          description: 'Record a conversation for AI learning',
          inputSchema: {
            type: 'object',
            properties: {
              userInput: {
                type: 'string',
                description: 'User input message',
              },
              assistantResponse: {
                type: 'string',
                description: 'Assistant response',
              },
              actionTaken: {
                type: 'string',
                description: 'Action that was taken (optional)',
              },
              success: {
                type: 'boolean',
                description: 'Whether the action was successful',
              },
              gasUsed: {
                type: 'string',
                description: 'Gas used for blockchain operations (optional)',
              },
              transactionHash: {
                type: 'string',
                description: 'Transaction hash if applicable (optional)',
              },
            },
            required: ['userInput', 'assistantResponse', 'success'],
          },
        },
        {
          name: 'get_personalized_suggestions',
          description: 'Get AI-powered personalized suggestions based on learning',
          inputSchema: {
            type: 'object',
            properties: {
              context: {
                type: 'string',
                description: 'Current context or user request',
              },
            },
            required: ['context'],
          },
        },
        {
          name: 'get_learning_insights',
          description: 'Get AI learning insights and patterns',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'update_user_preferences',
          description: 'Update user preferences for personalized experience',
          inputSchema: {
            type: 'object',
            properties: {
              preferences: {
                type: 'object',
                description: 'User preferences object',
                properties: {
                  preferredGasPrice: {
                    type: 'string',
                    description: 'Preferred gas price setting',
                  },
                  autoConfirmLowRisk: {
                    type: 'boolean',
                    description: 'Auto-confirm low risk transactions',
                  },
                  verboseLogging: {
                    type: 'boolean',
                    description: 'Enable verbose logging',
                  },
                },
              },
            },
            required: ['preferences'],
          },
        },
        {
          name: 'get_ai_memory_stats',
          description: 'Get AI memory and learning statistics',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'store_kv_data',
          description: 'Store data in 0G Key-Value storage',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'Storage key',
              },
              value: {
                type: 'string',
                description: 'Data to store',
              },
              streamId: {
                type: 'string',
                description: 'KV stream identifier (optional)',
              },
            },
            required: ['key', 'value'],
          },
        },
        {
          name: 'retrieve_kv_data',
          description: 'Retrieve data from 0G Key-Value storage',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'Storage key to retrieve',
              },
              streamId: {
                type: 'string',
                description: 'KV stream identifier (optional)',
              },
            },
            required: ['key'],
          },
        },
        {
          name: 'analyze_contract',
          description: 'Analyze a smart contract for structure, functions, and patterns',
          inputSchema: {
            type: 'object',
            properties: {
              address: {
                type: 'string',
                description: 'Contract address to analyze',
              },
            },
            required: ['address'],
          },
        },
        {
          name: 'explore_contract',
          description: 'Comprehensive contract exploration with risk assessment and tools generation',
          inputSchema: {
            type: 'object',
            properties: {
              address: {
                type: 'string',
                description: 'Contract address to explore',
              },
              includeTools: {
                type: 'boolean',
                description: 'Generate interaction tools for discovered functions',
              },
            },
            required: ['address'],
          },
        },
        {
          name: 'generate_contract_tools',
          description: 'Generate MCP tools for interacting with a contract',
          inputSchema: {
            type: 'object',
            properties: {
              address: {
                type: 'string',
                description: 'Contract address to generate tools for',
              },
              includeReadFunctions: {
                type: 'boolean',
                description: 'Include tools for read-only functions',
              },
              includeWriteFunctions: {
                type: 'boolean',
                description: 'Include tools for state-changing functions',
              },
              maxTools: {
                type: 'number',
                description: 'Maximum number of tools to generate',
              },
            },
            required: ['address'],
          },
        },
        {
          name: 'execute_workflow',
          description: 'Execute a multi-step contract workflow',
          inputSchema: {
            type: 'object',
            properties: {
              workflowId: {
                type: 'string',
                description: 'Workflow identifier (e.g., token_swap, nft_purchase)',
              },
              parameters: {
                type: 'object',
                description: 'Workflow parameters',
              },
            },
            required: ['workflowId'],
          },
        },
        {
          name: 'list_workflows',
          description: 'List available contract workflows',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'test_contract',
          description: 'Run comprehensive tests on a smart contract',
          inputSchema: {
            type: 'object',
            properties: {
              address: {
                type: 'string',
                description: 'Contract address to test',
              },
              includeFunctionTests: {
                type: 'boolean',
                description: 'Run function-level tests',
              },
              includeSecurityTests: {
                type: 'boolean',
                description: 'Run security analysis',
              },
              includeGasAnalysis: {
                type: 'boolean',
                description: 'Run gas usage analysis',
              },
            },
            required: ['address'],
          },
        },
        {
          name: 'get_contract_stats',
          description: 'Get statistics about analyzed contracts and generated tools',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        // 0G Learning and Documentation Tools
        {
          name: 'check_0g_updates',
          description: 'Check for recent updates in 0G ecosystem (releases, docs, blog)',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_latest_0g_info',
          description: 'Get latest 0G releases, documentation, and tutorials',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'search_0g_docs',
          description: 'Search 0G documentation for specific topics or keywords',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query for 0G documentation',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_learning_path',
          description: 'Generate personalized 0G learning path based on skill level',
          inputSchema: {
            type: 'object',
            properties: {
              skillLevel: {
                type: 'string',
                enum: ['beginner', 'intermediate', 'advanced'],
                description: 'Developer skill level',
              },
            },
            required: ['skillLevel'],
          },
        },
        {
          name: 'get_0g_examples',
          description: 'Get practical 0G code examples and tutorials',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                enum: ['storage', 'compute', 'contracts', 'sdk'],
                description: 'Category of examples to fetch',
              },
            },
            required: ['category'],
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
          
          // AI Learning & KV Storage Tools
          case 'initialize_ai_user':
            return await this.handleInitializeAIUser(args);
          
          case 'record_conversation':
            return await this.handleRecordConversation(args);
          
          case 'get_personalized_suggestions':
            return await this.handleGetPersonalizedSuggestions(args);
          
          case 'get_learning_insights':
            return await this.handleGetLearningInsights();
          
          case 'update_user_preferences':
            return await this.handleUpdateUserPreferences(args);
          
          case 'get_ai_memory_stats':
            return await this.handleGetAIMemoryStats();
          
          case 'store_kv_data':
            return await this.handleStoreKVData(args);
          
          case 'retrieve_kv_data':
            return await this.handleRetrieveKVData(args);
          
          // Contract Intelligence Tools
          case 'analyze_contract':
            return await this.handleAnalyzeContract(args);
          
          case 'explore_contract':
            return await this.handleExploreContract(args);
          
          case 'generate_contract_tools':
            return await this.handleGenerateContractTools(args);
          
          case 'execute_workflow':
            return await this.handleExecuteWorkflow(args);
          
          case 'list_workflows':
            return await this.handleListWorkflows();
          
          case 'test_contract':
            return await this.handleTestContract(args);
          
          case 'get_contract_stats':
            return await this.handleGetContractStats();
          
          // 0G Learning and Documentation handlers
          case 'check_0g_updates':
            return await this.handleCheck0GUpdates();
          
          case 'get_latest_0g_info':
            return await this.handleGetLatest0GInfo();
          
          case 'search_0g_docs':
            return await this.handleSearch0GDocs(args?.query as string);
          
          case 'get_learning_path':
            return await this.handleGetLearningPath(args?.skillLevel as 'beginner' | 'intermediate' | 'advanced');
          
          case 'get_0g_examples':
            return await this.handleGet0GExamples(args?.category as 'storage' | 'compute' | 'contracts' | 'sdk');
          
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
      this.storageClient.connectWallet(privateKey);
      this.kvStorageClient.connectWallet(privateKey); // Connect KV storage
      this.isWalletConnected = true;
      const walletAddress = this.networkClient.getWalletAddress();
      
      console.error(`🔐 Wallet connected: ${walletAddress}`);
      
      // Initialize AI user with wallet address as user ID
      await this.aiStateManager.initializeUser(walletAddress || 'default_user');
      this.currentUserId = walletAddress || 'default_user';
      
      return {
        content: [
          {
            type: 'text',
            text: `🔐 Wallet connected successfully!\nAddress: ${walletAddress}\n⚠️  Warning: Private key is stored in memory. Use only for testing.\n✅ Network, storage, and KV storage clients connected.\n🤖 AI learning system initialized for personalized assistance!`,
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

  // AI Learning & KV Storage Handlers
  private async handleInitializeAIUser(args: any) {
    const { userId } = args;
    
    try {
      console.error(`🤖 Initializing AI user: ${userId}`);
      this.currentUserId = userId;
      
      await this.aiStateManager.initializeUser(userId);
      
      return {
        content: [
          {
            type: 'text',
            text: `🤖 AI Assistant initialized for user: ${userId}\n✅ Personal learning and memory system active\n💾 Using 0G Key-Value storage for persistence\n🧠 Ready to learn from your interactions!`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ AI user initialization failed: ${error}`);
      throw new Error(`AI initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleRecordConversation(args: any) {
    const { userInput, assistantResponse, actionTaken, success, gasUsed, transactionHash } = args;
    
    try {
      console.error(`💬 Recording conversation for learning`);
      
      await this.aiStateManager.recordConversation(
        userInput,
        assistantResponse,
        actionTaken,
        success,
        gasUsed,
        transactionHash
      );
      
      return {
        content: [
          {
            type: 'text',
            text: `💬 Conversation recorded for AI learning\n🧠 Pattern analysis: ${success ? 'Success patterns learned' : 'Error patterns noted'}\n📊 Memory updated with new insights`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Conversation recording failed: ${error}`);
      throw new Error(`Conversation recording failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGetPersonalizedSuggestions(args: any) {
    const { context } = args;
    
    try {
      console.error(`💡 Generating personalized suggestions for context: ${context}`);
      
      const suggestions = this.aiStateManager.getPersonalizedSuggestions(context);
      
      return {
        content: [
          {
            type: 'text',
            text: `💡 Personalized Suggestions:\n\n${suggestions.length > 0 ? suggestions.join('\n\n') : '🔍 No specific suggestions yet. Continue using the assistant to build personalized insights!'}`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Failed to get suggestions: ${error}`);
      throw new Error(`Suggestion generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGetLearningInsights() {
    try {
      console.error(`📊 Generating AI learning insights`);
      
      const insights = await this.aiStateManager.generateLearningInsights();
      
      const insightText = insights.length > 0 
        ? insights.map(insight => 
            `📈 ${insight.pattern}:\n` +
            `  • Frequency: ${insight.frequency} uses\n` +
            `  • Success Rate: ${(insight.success_rate * 100).toFixed(1)}%\n` +
            `  • Gas Optimization: ${insight.gas_optimization.toFixed(1)}%\n` +
            `  • Recommendation: ${insight.recommendation}`
          ).join('\n\n')
        : '🔍 Continue using the assistant to generate learning insights!';
      
      return {
        content: [
          {
            type: 'text',
            text: `🧠 AI Learning Insights:\n\n${insightText}`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Failed to get learning insights: ${error}`);
      throw new Error(`Learning insights failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleUpdateUserPreferences(args: any) {
    const { preferences } = args;
    
    try {
      console.error(`⚙️ Updating user preferences`);
      
      await this.aiStateManager.updateUserPreferences(preferences);
      
      return {
        content: [
          {
            type: 'text',
            text: `⚙️ User preferences updated successfully!\n✅ New settings applied to AI assistant\n💾 Preferences saved to 0G KV storage\n🎯 Future interactions will be personalized based on your preferences`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Failed to update preferences: ${error}`);
      throw new Error(`Preference update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGetAIMemoryStats() {
    try {
      console.error(`📊 Getting AI memory statistics`);
      
      const stats = this.aiStateManager.getMemoryStats();
      
      return {
        content: [
          {
            type: 'text',
            text: `🧠 AI Memory Statistics:\n\n` +
                  `👤 User: ${stats.userId || 'Not initialized'}\n` +
                  `💭 Short-term Memory: ${stats.shortTermMemory} conversations\n` +
                  `🧠 Learned Patterns: ${stats.longTermPatterns} patterns\n` +
                  `📋 Contract Knowledge: ${stats.contractKnowledge} contracts\n` +
                  `🎯 Learning Status: ${stats.learningEnabled ? 'Active' : 'Disabled'}\n\n` +
                  `📈 Memory Utilization:\n` +
                  `  • Short-term: ${stats.memoryUtilization.shortTerm}\n` +
                  `  • Long-term: ${stats.memoryUtilization.longTerm} patterns\n` +
                  `  • Avg Pattern Confidence: ${(stats.memoryUtilization.avgPatternConfidence * 100).toFixed(1)}%`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Failed to get memory stats: ${error}`);
      throw new Error(`Memory stats failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleStoreKVData(args: any) {
    if (!this.isWalletConnected) {
      throw new Error('Wallet not connected. Use connect_wallet first for KV storage operations.');
    }

    const { key, value, streamId } = args;
    
    try {
      console.error(`💾 Storing data in 0G KV storage: ${key}`);
      
      // Use a default stream if none provided
      const targetStreamId = streamId || 'user_data_v1';
      const dataBuffer = Buffer.from(value);
      
      const result = await this.kvStorageClient.setKV(key, value);
      
      return {
        content: [
          {
            type: 'text',
            text: `💾 Data stored in 0G KV Storage successfully!\n🔑 Key: ${key}\n📊 Stream: ${targetStreamId}\n📦 Size: ${dataBuffer.length} bytes\n🔗 Transaction: ${result}\n\n✅ Data is now permanently stored on 0G network!`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ KV data storage failed: ${error}`);
      throw new Error(`KV storage failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleRetrieveKVData(args: any) {
    const { key, streamId } = args;
    
    try {
      console.error(`📥 Retrieving data from 0G KV storage: ${key}`);
      
      const targetStreamId = streamId || 'user_data_v1';
      
      const retrievedData = await this.kvStorageClient.getKV(key);
      const displayData = retrievedData !== null ? JSON.stringify(retrievedData) : '(no data found)';
      
      return {
        content: [
          {
            type: 'text',
            text: `📥 Data retrieved from 0G KV Storage:\n🔑 Key: ${key}\n📊 Stream: ${targetStreamId}\n📄 Data: ${displayData}\n\n✅ Data successfully retrieved from 0G network!`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ KV data retrieval failed: ${error}`);
      throw new Error(`KV retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Contract Intelligence Handlers

  private async handleAnalyzeContract(args: any) {
    const { address } = args;
    
    try {
      console.error(`🔍 Analyzing contract: ${address}`);
      
      const result = await this.contractAnalysisEngine.analyzeContract(address);
      
      if (!result.success) {
        throw new Error(result.error || 'Contract analysis failed');
      }
      
      const contractInfo = result.contractInfo!;
      
      return {
        content: [
          {
            type: 'text',
            text: `🔍 Contract Analysis Results for ${address}:\n\n` +
                  `📋 Contract Details:\n` +
                  `• Address: ${contractInfo.address}\n` +
                  `• Verified: ${contractInfo.verified ? '✅' : '❌'}\n` +
                  `• Functions: ${contractInfo.functions.length}\n` +
                  `• Events: ${contractInfo.events.length}\n\n` +
                  `🔧 Functions Found:\n${contractInfo.functions.slice(0, 10).map(f => 
                    `• ${f.name}(${f.inputs.map(i => i.type).join(', ')}) - ${f.stateMutability}`
                  ).join('\n')}\n` +
                  `${contractInfo.functions.length > 10 ? `... and ${contractInfo.functions.length - 10} more\n` : ''}\n` +
                  `💡 Suggestions:\n${result.suggestions.map(s => `• ${s}`).join('\n')}\n\n` +
                  `✅ Analysis completed with ${Math.round(result.confidence * 100)}% confidence`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Contract analysis failed: ${error}`);
      throw new Error(`Contract analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleExploreContract(args: any) {
    const { address, includeTools = false } = args;
    
    try {
      console.error(`🚀 Exploring contract: ${address}`);
      
      const result = await this.contractExplorer.exploreContracts({ 
        address, 
        includeTools 
      });
      
      if (!result.success || result.contracts.length === 0) {
        throw new Error(result.error || 'Contract exploration failed');
      }
      
      const contractData = result.contracts[0];
      const info = contractData.contractInfo;
      const risk = contractData.riskAssessment;
      
      return {
        content: [
          {
            type: 'text',
            text: `🚀 Contract Exploration Results for ${address}:\n\n` +
                  `📋 Contract Overview:\n` +
                  `• Address: ${info.address}\n` +
                  `• Verified: ${info.verified ? '✅' : '❌'}\n` +
                  `• Functions: ${info.functions.length}\n` +
                  `• Events: ${info.events.length}\n\n` +
                  `🛡️ Risk Assessment:\n` +
                  `• Risk Level: ${risk.level.toUpperCase()}\n` +
                  `• Risk Score: ${risk.score}/100\n` +
                  `• Risk Factors: ${risk.factors.length}\n\n` +
                  `🔧 Generated Tools: ${contractData.generatedTools?.length || 0}\n\n` +
                  `💡 Recommendations:\n${risk.recommendations.map(r => `• ${r}`).join('\n')}\n\n` +
                  `✅ Exploration completed successfully`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Contract exploration failed: ${error}`);
      throw new Error(`Contract exploration failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGenerateContractTools(args: any) {
    const { 
      address, 
      includeReadFunctions = true, 
      includeWriteFunctions = true, 
      maxTools = 25 
    } = args;
    
    try {
      console.error(`🔧 Generating tools for contract: ${address}`);
      
      // First analyze the contract
      const analysisResult = await this.contractAnalysisEngine.analyzeContract(address);
      if (!analysisResult.success || !analysisResult.contractInfo) {
        throw new Error(analysisResult.error || 'Contract analysis failed');
      }
      
      // Generate tools
      const result = await this.dynamicToolGenerator.generateToolsForContract(
        analysisResult.contractInfo,
        {
          includeReadFunctions,
          includeWriteFunctions,
          maxToolsPerContract: maxTools
        }
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Tool generation failed');
      }
      
      const readTools = result.tools.filter(t => t.metadata.category === 'read').length;
      const writeTools = result.tools.filter(t => t.metadata.category === 'write').length;
      const payableTools = result.tools.filter(t => t.metadata.category === 'payable').length;
      
      return {
        content: [
          {
            type: 'text',
            text: `🔧 Tool Generation Results for ${address}:\n\n` +
                  `📊 Tools Generated: ${result.tools.length}\n` +
                  `• Read-only tools: ${readTools}\n` +
                  `• Write tools: ${writeTools}\n` +
                  `• Payable tools: ${payableTools}\n\n` +
                  `🔧 Generated Tool Names:\n${result.tools.slice(0, 10).map(t => 
                    `• ${t.name} - ${t.metadata.category}`
                  ).join('\n')}\n` +
                  `${result.tools.length > 10 ? `... and ${result.tools.length - 10} more\n` : ''}\n` +
                  `${result.warnings.length > 0 ? `⚠️ Warnings:\n${result.warnings.map(w => `• ${w}`).join('\n')}\n\n` : ''}` +
                  `✅ Tools generated and ready for use!`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Tool generation failed: ${error}`);
      throw new Error(`Tool generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleExecuteWorkflow(args: any) {
    const { workflowId, parameters = {} } = args;
    
    try {
      console.error(`🚀 Executing workflow: ${workflowId}`);
      
      const result = await this.workflowEngine.executeWorkflow(workflowId, parameters);
      
      const execution = result.execution;
      const statusIcon = result.success ? '✅' : '❌';
      
      return {
        content: [
          {
            type: 'text',
            text: `🚀 Workflow Execution Results:\n\n` +
                  `${statusIcon} Workflow: ${workflowId}\n` +
                  `📊 Status: ${execution.status.toUpperCase()}\n` +
                  `⏱️ Execution Time: ${(execution.endTime! - execution.startTime) / 1000}s\n` +
                  `✅ Completed Steps: ${execution.completedSteps.length}\n` +
                  `❌ Failed Steps: ${execution.failedSteps.length}\n` +
                  `💰 Gas Used: ${execution.totalGasUsed}\n` +
                  `📝 Transactions: ${execution.transactions.length}\n\n` +
                  `${execution.transactions.length > 0 ? 
                    `🔗 Transaction Hashes:\n${execution.transactions.map(tx => 
                      `• ${tx.transactionHash} (${tx.gasUsed} gas)`
                    ).join('\n')}\n\n` : ''}` +
                  `${execution.errors.length > 0 ? 
                    `❌ Errors:\n${execution.errors.map(e => `• ${e}`).join('\n')}\n\n` : ''}` +
                  `💡 Recommendations:\n${result.recommendations.map(r => `• ${r}`).join('\n')}`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Workflow execution failed: ${error}`);
      throw new Error(`Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleListWorkflows() {
    try {
      console.error(`📋 Listing available workflows`);
      
      const workflows = this.workflowEngine.getAvailableWorkflows();
      
      return {
        content: [
          {
            type: 'text',
            text: `📋 Available Contract Workflows:\n\n` +
                  workflows.map(w => 
                    `🔧 ${w.name} (${w.id})\n` +
                    `   📝 ${w.description}\n` +
                    `   🏷️ Category: ${w.category}\n` +
                    `   ⚡ Steps: ${w.steps.length}\n` +
                    `   💰 Estimated Gas: ${w.totalEstimatedGas.toLocaleString()}\n` +
                    `   🛡️ Risk: ${w.riskLevel.toUpperCase()}\n`
                  ).join('\n') +
                  `\n✅ Total workflows available: ${workflows.length}`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Failed to list workflows: ${error}`);
      throw new Error(`Failed to list workflows: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleTestContract(args: any) {
    const { 
      address, 
      includeFunctionTests = true, 
      includeSecurityTests = true, 
      includeGasAnalysis = true 
    } = args;
    
    try {
      console.error(`🧪 Testing contract: ${address}`);
      
      const result = await this.testingFramework.testContract(address, {
        includeFunctionTests,
        includeSecurityTests,
        includeGasAnalysis
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `🧪 Contract Testing Results for ${address}:\n\n` +
                  `📊 Test Summary:\n` +
                  `• Total Tests: ${result.totalTests}\n` +
                  `• Passed: ${result.passedTests} ✅\n` +
                  `• Failed: ${result.failedTests} ❌\n` +
                  `• Success Rate: ${Math.round((result.passedTests / result.totalTests) * 100)}%\n\n` +
                  `⏱️ Execution Time: ${result.totalExecutionTime / 1000}s\n` +
                  `💰 Total Gas Used: ${result.totalGasUsed}\n\n` +
                  `📈 Test Coverage:\n` +
                  `• Functions Total: ${result.coverage.functionsTotal}\n` +
                  `• Functions Tested: ${result.coverage.functionsTested}\n` +
                  `• Coverage: ${result.coverage.coveragePercentage}%\n\n` +
                  `${result.coverage.functionsUntested.length > 0 ? 
                    `🔴 Untested Functions:\n${result.coverage.functionsUntested.map(f => `• ${f}`).join('\n')}\n\n` : ''}` +
                  `💡 Recommendations:\n${result.recommendations.map(r => `• ${r}`).join('\n')}\n\n` +
                  `✅ Testing completed successfully`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Contract testing failed: ${error}`);
      throw new Error(`Contract testing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGetContractStats() {
    try {
      console.error(`📊 Getting contract intelligence statistics`);
      
      const analysisStats = this.contractAnalysisEngine.getStats();
      const toolStats = this.dynamicToolGenerator.getStats();
      const explorationStats = this.contractExplorer.getExplorationStats();
      
      return {
        content: [
          {
            type: 'text',
            text: `📊 Contract Intelligence Statistics:\n\n` +
                  `🔍 Analysis Engine:\n` +
                  `• Contracts Analyzed: ${analysisStats.totalAnalyzed}\n` +
                  `• Verified Contracts: ${analysisStats.verifiedContracts}\n` +
                  `• Cached Contracts: ${analysisStats.cachedContracts}\n\n` +
                  `🔧 Tool Generator:\n` +
                  `• Contracts with Tools: ${toolStats.contractsWithTools}\n` +
                  `• Total Tools Generated: ${toolStats.totalTools}\n` +
                  `• Read Tools: ${toolStats.toolsByCategory.read}\n` +
                  `• Write Tools: ${toolStats.toolsByCategory.write}\n` +
                  `• Payable Tools: ${toolStats.toolsByCategory.payable}\n\n` +
                  `🚀 Explorer:\n` +
                  `• Contracts Explored: ${explorationStats.totalExplored}\n` +
                  `• Risk Distribution:\n` +
                  `  - Low: ${explorationStats.riskDistribution.low}\n` +
                  `  - Medium: ${explorationStats.riskDistribution.medium}\n` +
                  `  - High: ${explorationStats.riskDistribution.high}\n` +
                  `  - Critical: ${explorationStats.riskDistribution.critical}\n\n` +
                  `✅ Statistics retrieved successfully`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Failed to get contract stats: ${error}`);
      throw new Error(`Failed to get contract stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 0G Learning and Documentation handlers
  private async handleCheck0GUpdates() {
    try {
      console.error('🔄 Checking for 0G updates...');
      
      const updateCheck = await this.knowledgeEngine.checkForUpdates();
      
      return {
        content: [
          {
            type: 'text',
            text: `🔍 0G Ecosystem Update Check\n\n` +
                  `📊 Status: ${updateCheck.hasUpdates ? 'Updates found!' : 'No new updates'}\n\n` +
                  `${updateCheck.updates.length > 0 ? 
                    `📋 Recent Updates:\n${updateCheck.updates.map(u => `• ${u}`).join('\n')}\n\n` : ''}` +
                  `⏰ Last checked: ${new Date().toLocaleString()}\n\n` +
                  `✅ Update check completed`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Failed to check 0G updates: ${error}`);
      throw new Error(`Failed to check 0G updates: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGetLatest0GInfo() {
    try {
      console.error('📈 Fetching latest 0G information...');
      
      const latest = await this.knowledgeEngine.getLatest0GUpdates();
      
      return {
        content: [
          {
            type: 'text',
            text: `📊 Latest 0G Ecosystem Information\n\n` +
                  `🚀 Recent Releases (${latest.releases.length}):\n${
                    latest.releases.slice(0, 5).map(r => 
                      `• ${r.name || 'Unnamed'} (${r.tag_name || 'No tag'}) - ${r.published_at ? new Date(r.published_at).toLocaleDateString() : 'Unknown date'}`
                    ).join('\n')
                  }\n\n` +
                  `📚 Documentation Updates (${latest.documentation.length}):\n${
                    latest.documentation.slice(0, 3).map(d => `• ${d}`).join('\n')
                  }\n\n` +
                  `🎓 Tutorial Resources (${latest.tutorials.length}):\n${
                    latest.tutorials.slice(0, 3).map(t => `• ${t}`).join('\n')
                  }\n\n` +
                  `⏰ Retrieved: ${new Date().toLocaleString()}\n\n` +
                  `✅ Latest information fetched successfully`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Failed to get latest 0G info: ${error}`);
      throw new Error(`Failed to get latest 0G info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleSearch0GDocs(query: string) {
    try {
      console.error(`🔍 Searching 0G documentation for: "${query}"`);
      
      const results = await this.knowledgeEngine.search0GDocumentation(query);
      
      return {
        content: [
          {
            type: 'text',
            text: `🔍 0G Documentation Search Results\n\n` +
                  `📝 Query: "${query}"\n` +
                  `📊 Results found: ${results.length}\n\n` +
                  `${results.length > 0 ? 
                    `📋 Matching sources:\n${results.map(r => `• ${r}`).join('\n')}\n\n` : 
                    `❌ No matches found for "${query}"\n\n💡 Try searching for:\n• "storage" - 0G Storage features\n• "compute" - AI compute capabilities\n• "sdk" - SDK documentation\n• "smart contract" - Contract development\n\n`}` +
                  `⏰ Search completed: ${new Date().toLocaleString()}\n\n` +
                  `✅ Search completed successfully`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Failed to search 0G docs: ${error}`);
      throw new Error(`Failed to search 0G docs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGetLearningPath(skillLevel: 'beginner' | 'intermediate' | 'advanced') {
    try {
      console.error(`🎓 Generating learning path for ${skillLevel} level`);
      
      const learningPath = await this.knowledgeEngine.generateLearningPath(skillLevel);
      
      return {
        content: [
          {
            type: 'text',
            text: `🎓 0G Learning Path - ${skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)} Level\n\n` +
                  `⏱️ Estimated time: ${learningPath.estimatedTime}\n\n` +
                  `📋 Prerequisites:\n${learningPath.prerequisites.map(p => `• ${p}`).join('\n')}\n\n` +
                  `🛤️ Learning Path:\n${learningPath.path.map(step => `${step}`).join('\n')}\n\n` +
                  `💡 Tips:\n• Take your time with each step\n• Build practical projects as you learn\n• Join the 0G community for support\n• Practice on 0G Galileo Testnet\n\n` +
                  `🔗 Key Resources:\n• 0G Docs: https://docs.0g.ai\n• SDK Examples: https://github.com/0glabs/0g-ts-sdk\n• Testnet Explorer: https://chainscan-galileo.0g.ai\n\n` +
                  `✅ Learning path generated successfully`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Failed to generate learning path: ${error}`);
      throw new Error(`Failed to generate learning path: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGet0GExamples(category: 'storage' | 'compute' | 'contracts' | 'sdk') {
    try {
      console.error(`💻 Fetching 0G examples for category: ${category}`);
      
      const examples = {
        storage: [
          '📁 File Upload Example: https://github.com/0glabs/0g-ts-sdk/blob/main/examples/storage-upload.ts',
          '📥 File Download: https://github.com/0glabs/0g-ts-sdk/blob/main/examples/storage-download.ts',
          '🔒 Merkle Verification: Basic file integrity verification',
          '📦 Batch Operations: Uploading multiple files efficiently'
        ],
        compute: [
          '🤖 AI Model Deployment: Deploy machine learning models',
          '⚡ Inference Requests: Execute AI model inference',
          '🔄 Model Updates: Update deployed AI models',
          '📊 Performance Monitoring: Track AI compute usage'
        ],
        contracts: [
          '📋 ERC20 Token: https://github.com/0glabs/0g-chain/tree/main/tests/contracts',
          '🎨 NFT Contract: Basic ERC721 implementation',
          '🏪 Marketplace: Simple NFT marketplace contract',
          '🔐 Multisig Wallet: Multi-signature wallet example'
        ],
        sdk: [
          '🚀 Quick Start: https://github.com/0glabs/0g-ts-sdk/blob/main/examples/quickstart.ts',
          '🔗 Network Connection: Connect to 0G network',
          '💰 Wallet Integration: Connect and use wallets',
          '📡 Event Listening: Listen to blockchain events'
        ]
      };
      
      const categoryExamples = examples[category] || [];
      
      return {
        content: [
          {
            type: 'text',
            text: `💻 0G ${category.charAt(0).toUpperCase() + category.slice(1)} Examples\n\n` +
                  `📋 Available Examples:\n${categoryExamples.map(e => `• ${e}`).join('\n')}\n\n` +
                  `🔗 Additional Resources:\n• 0G TypeScript SDK: https://github.com/0glabs/0g-ts-sdk\n• 0G Documentation: https://docs.0g.ai\n• Test Network: 0G Galileo Testnet (Chain ID: 16602)\n\n` +
                  `💡 Getting Started:\n• Clone the 0G SDK repository\n• Follow the README setup instructions\n• Run examples in a local environment\n• Experiment with 0G Galileo Testnet\n\n` +
                  `✅ Examples retrieved successfully`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Failed to get 0G examples: ${error}`);
      throw new Error(`Failed to get 0G examples: ${error instanceof Error ? error.message : String(error)}`);
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
