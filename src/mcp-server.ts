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
        version: '0.2.0',
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
    console.error('0G Voice Assistant MCP Server initialized (13 tools)');
  }

  private setupToolHandlers() {
    // List available tools (13 consolidated tools)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // --- Network & Blockchain (4) ---
        {
          name: 'connect_to_0g',
          title: 'Connect to 0G Network',
          description: 'Connect to 0G Galileo Testnet.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
          },
        },
        {
          name: 'connect_wallet',
          title: 'Connect Wallet',
          description: 'Connect a wallet using private key, or get wallet info if already connected (call with no args).',
          inputSchema: {
            type: 'object',
            properties: {
              privateKey: {
                type: 'string',
                description: 'Private key for wallet connection. Omit to get info about already-connected wallet.',
              },
            },
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        {
          name: 'get_balance',
          title: 'Get Balance',
          description: 'Get account balance, network info, and gas price. Uses connected wallet if no address provided.',
          inputSchema: {
            type: 'object',
            properties: {
              address: {
                type: 'string',
                description: 'Address to check. Omit to use connected wallet.',
              },
              includeNetworkInfo: {
                type: 'boolean',
                description: 'Include chain ID, block number, gas price. Defaults to true.',
              },
            },
          },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
          },
        },
        {
          name: 'send_transaction',
          title: 'Send Transaction',
          description: 'Send a transaction, estimate gas for a transaction, or check transaction status. Provide txHash to check status. Provide to+value to send (or set estimateOnly to get gas estimate). Omit all to get current gas price.',
          inputSchema: {
            type: 'object',
            properties: {
              to: {
                type: 'string',
                description: 'Recipient address.',
              },
              value: {
                type: 'string',
                description: 'Amount in A0GI.',
              },
              data: {
                type: 'string',
                description: 'Transaction data (hex string).',
              },
              estimateOnly: {
                type: 'boolean',
                description: 'If true, estimate gas without sending.',
              },
              txHash: {
                type: 'string',
                description: 'Transaction hash to check status of (ignores other params).',
              },
            },
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: false,
            openWorldHint: true,
          },
        },
        // --- Contracts (3) ---
        {
          name: 'deploy_contract',
          title: 'Deploy Contract',
          description: 'Deploy a smart contract to 0G network.',
          inputSchema: {
            type: 'object',
            properties: {
              bytecode: {
                type: 'string',
                description: 'Contract bytecode (hex, 0x prefix).',
              },
              constructorArgs: {
                type: 'array',
                description: 'Constructor arguments.',
                items: {},
              },
            },
            required: ['bytecode'],
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true,
          },
        },
        {
          name: 'analyze_contract',
          title: 'Analyze Contract',
          description: 'Analyze a smart contract. Modes: "analyze" (structure/functions), "explore" (risk assessment), "generate_tools" (MCP tool generation), "test" (run tests), "stats" (aggregate statistics, no address needed).',
          inputSchema: {
            type: 'object',
            properties: {
              address: {
                type: 'string',
                description: 'Contract address. Required for all modes except "stats".',
              },
              mode: {
                type: 'string',
                enum: ['analyze', 'explore', 'generate_tools', 'test', 'stats'],
                description: 'Analysis mode. Defaults to "analyze".',
              },
              includeTools: {
                type: 'boolean',
                description: 'For "explore" mode: generate interaction tools.',
              },
              includeReadFunctions: {
                type: 'boolean',
                description: 'For "generate_tools" mode: include read-only functions.',
              },
              includeWriteFunctions: {
                type: 'boolean',
                description: 'For "generate_tools" mode: include write functions.',
              },
              maxTools: {
                type: 'number',
                description: 'For "generate_tools" mode: max tools to generate.',
              },
              includeFunctionTests: {
                type: 'boolean',
                description: 'For "test" mode: run function-level tests.',
              },
              includeSecurityTests: {
                type: 'boolean',
                description: 'For "test" mode: run security analysis.',
              },
              includeGasAnalysis: {
                type: 'boolean',
                description: 'For "test" mode: run gas usage analysis.',
              },
            },
          },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
          },
        },
        {
          name: 'run_workflow',
          title: 'Run Workflow',
          description: 'Execute a multi-step contract workflow, or list available workflows (omit workflowId to list).',
          inputSchema: {
            type: 'object',
            properties: {
              workflowId: {
                type: 'string',
                description: 'Workflow identifier. Omit to list available workflows.',
              },
              parameters: {
                type: 'object',
                description: 'Workflow execution parameters.',
              },
            },
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: false,
            openWorldHint: true,
          },
        },
        // --- Storage (2) ---
        {
          name: 'upload_file',
          title: 'Upload File',
          description: 'Upload a file to 0G Storage, or calculate its Merkle root hash without uploading (dryRun: true).',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the file.',
              },
              dryRun: {
                type: 'boolean',
                description: 'If true, only calculate Merkle root hash. No wallet required.',
              },
            },
            required: ['filePath'],
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true,
          },
        },
        {
          name: 'download_file',
          title: 'Download File',
          description: 'Download a file from 0G Storage, or check file availability (infoOnly: true).',
          inputSchema: {
            type: 'object',
            properties: {
              rootHash: {
                type: 'string',
                description: 'Merkle root hash of the file.',
              },
              outputPath: {
                type: 'string',
                description: 'Local path to save the file. Required unless infoOnly is true.',
              },
              infoOnly: {
                type: 'boolean',
                description: 'If true, only check availability without downloading.',
              },
            },
            required: ['rootHash'],
          },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
          },
        },
        // --- KV Storage (2) ---
        {
          name: 'store_kv_data',
          title: 'Store KV Data',
          description: 'Store data in 0G Key-Value storage. Requires connected wallet.',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'Storage key.',
              },
              value: {
                type: 'string',
                description: 'Data to store.',
              },
              streamId: {
                type: 'string',
                description: 'KV stream identifier (optional).',
              },
            },
            required: ['key', 'value'],
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: true,
            openWorldHint: true,
          },
        },
        {
          name: 'retrieve_kv_data',
          title: 'Retrieve KV Data',
          description: 'Retrieve data from 0G Key-Value storage.',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'Storage key to retrieve.',
              },
              streamId: {
                type: 'string',
                description: 'KV stream identifier (optional).',
              },
            },
            required: ['key'],
          },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
          },
        },
        // --- AI Memory (1) ---
        {
          name: 'ai_memory',
          title: 'AI Memory',
          description: 'AI learning and memory system. Actions: "init" (initialize user), "record" (record conversation), "suggestions" (get personalized suggestions), "insights" (get learning insights), "update_preferences" (update user prefs), "stats" (memory statistics).',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['init', 'record', 'suggestions', 'insights', 'update_preferences', 'stats'],
                description: 'Action to perform.',
              },
              userId: {
                type: 'string',
                description: 'For "init": user identifier.',
              },
              userInput: {
                type: 'string',
                description: 'For "record": user input message.',
              },
              assistantResponse: {
                type: 'string',
                description: 'For "record": assistant response.',
              },
              actionTaken: {
                type: 'string',
                description: 'For "record": action that was taken.',
              },
              success: {
                type: 'boolean',
                description: 'For "record": whether the action was successful.',
              },
              gasUsed: {
                type: 'string',
                description: 'For "record": gas used.',
              },
              transactionHash: {
                type: 'string',
                description: 'For "record": transaction hash.',
              },
              context: {
                type: 'string',
                description: 'For "suggestions": current context or user request.',
              },
              preferences: {
                type: 'object',
                description: 'For "update_preferences": preferences object with preferredGasPrice, autoConfirmLowRisk, verboseLogging.',
              },
            },
            required: ['action'],
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: false,
          },
        },
        // --- Documentation (1) ---
        {
          name: '0g_docs',
          title: '0G Documentation',
          description: '0G documentation and learning resources. Actions: "updates" (check for updates), "latest" (latest releases/docs/tutorials), "search" (search docs), "learning_path" (personalized path), "examples" (code examples).',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['updates', 'latest', 'search', 'learning_path', 'examples'],
                description: 'Action to perform.',
              },
              query: {
                type: 'string',
                description: 'For "search": search query.',
              },
              skillLevel: {
                type: 'string',
                enum: ['beginner', 'intermediate', 'advanced'],
                description: 'For "learning_path": developer skill level.',
              },
              category: {
                type: 'string',
                enum: ['storage', 'compute', 'contracts', 'sdk'],
                description: 'For "examples": category of examples.',
              },
            },
            required: ['action'],
          },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
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
          case 'connect_wallet':
            return await this.handleConnectWallet(args);
          case 'get_balance':
            return await this.handleGetBalance(args);
          case 'send_transaction':
            return await this.handleSendTransaction(args);
          case 'deploy_contract':
            return await this.handleDeployContract(args);
          case 'analyze_contract':
            return await this.handleAnalyzeContract(args);
          case 'run_workflow':
            return await this.handleRunWorkflow(args);
          case 'upload_file':
            return await this.handleUploadFile(args);
          case 'download_file':
            return await this.handleDownloadFile(args);
          case 'store_kv_data':
            return await this.handleStoreKVData(args);
          case 'retrieve_kv_data':
            return await this.handleRetrieveKVData(args);
          case 'ai_memory':
            return await this.handleAIMemory(args);
          case '0g_docs':
            return await this.handle0GDocs(args);
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

  // ── Network & Blockchain Handlers ──────────────────────────────────

  private async handleConnect() {
    const connected = await this.networkClient.connect();
    return {
      content: [{
        type: 'text',
        text: connected
          ? 'Connected to 0G Galileo Testnet.'
          : 'Failed to connect to 0G network.',
      }],
    };
  }

  private async handleConnectWallet(args: any) {
    const { privateKey } = args || {};

    // No privateKey → return wallet info
    if (!privateKey) {
      if (!this.isWalletConnected) {
        return {
          content: [{ type: 'text', text: 'No wallet connected. Provide a privateKey to connect.' }],
        };
      }
      const walletAddress = this.networkClient.getWalletAddress();
      const balance = await this.networkClient.getBalance(walletAddress!);
      return {
        content: [{
          type: 'text',
          text: `Wallet Information:\nAddress: ${walletAddress}\nBalance: ${balance} A0GI\nNetwork: ${OG_CONFIG.networkName}`,
        }],
      };
    }

    try {
      this.networkClient.connectWallet(privateKey);
      this.storageClient.connectWallet(privateKey);
      this.kvStorageClient.connectWallet(privateKey);
      this.isWalletConnected = true;
      const walletAddress = this.networkClient.getWalletAddress();

      console.error(`Wallet connected: ${walletAddress}`);

      await this.aiStateManager.initializeUser(walletAddress || 'default_user');
      this.currentUserId = walletAddress || 'default_user';

      return {
        content: [{
          type: 'text',
          text: `Wallet connected.\nAddress: ${walletAddress}\nNetwork, storage, and KV storage clients connected.\nAI learning system initialized.`,
        }],
      };
    } catch (error) {
      this.isWalletConnected = false;
      throw new Error(`Failed to connect wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGetBalance(args: any) {
    const includeNetworkInfo = args?.includeNetworkInfo !== false;
    let address = args?.address;
    let isOwnWallet = false;

    if (!address) {
      if (!this.isWalletConnected) {
        return {
          content: [{ type: 'text', text: 'Provide an address or connect a wallet first using connect_wallet.' }],
        };
      }
      address = this.networkClient.getWalletAddress();
      isOwnWallet = true;
    }

    const balance = await this.networkClient.getBalance(address);
    let text = isOwnWallet
      ? `Wallet Address: ${address}\nBalance: ${balance} A0GI`
      : `Balance for ${address}: ${balance} A0GI`;

    if (includeNetworkInfo) {
      try {
        const info = await this.networkClient.getNetworkInfo();
        const gasPrice = await this.networkClient.getGasPrice();
        text += `\nNetwork: ${info.network}\nChain ID: ${info.chainId}\nBlock: ${info.blockNumber}\nGas Price: ${gasPrice} gwei`;
      } catch { /* partial result is fine */ }
    }

    return { content: [{ type: 'text', text }] };
  }

  private async handleSendTransaction(args: any) {
    const { to, value, data, estimateOnly, txHash } = args || {};

    // Mode 1: Check transaction status
    if (txHash) {
      try {
        const status = await this.networkClient.getTransactionStatus(txHash);
        return {
          content: [{
            type: 'text',
            text: `Transaction Status:\nHash: ${status.hash}\nFrom: ${status.from}\nTo: ${status.to}\nValue: ${status.value} A0GI\nStatus: ${status.status}\nBlock: ${status.blockNumber}\nConfirmations: ${status.confirmations}\nGas Used: ${status.gasUsed}`,
          }],
        };
      } catch (error) {
        throw new Error(`Failed to get transaction status: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Mode 2: Gas price only (no to/value)
    if (!to && !value) {
      try {
        const gasPrice = await this.networkClient.getGasPrice();
        return {
          content: [{ type: 'text', text: `Current Gas Price: ${gasPrice} gwei` }],
        };
      } catch (error) {
        throw new Error(`Failed to get gas price: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Mode 3: Estimate gas
    if (estimateOnly) {
      try {
        const gasPrice = await this.networkClient.getGasPrice();
        const gasEstimate = await this.networkClient.estimateGas(to, value, data);
        return {
          content: [{
            type: 'text',
            text: `Gas Estimate:\nGas Limit: ${gasEstimate}\nGas Price: ${gasPrice} gwei\nEstimated Cost: ${(parseFloat(gasEstimate) * parseFloat(gasPrice) / 1e9).toFixed(8)} A0GI`,
          }],
        };
      } catch (error) {
        throw new Error(`Failed to estimate gas: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Mode 4: Send transaction
    if (!this.isWalletConnected) {
      throw new Error('No wallet connected. Use connect_wallet first.');
    }

    try {
      console.error(`Sending transaction: ${value} A0GI to ${to}`);
      const hash = await this.networkClient.sendTransaction(to, value);
      console.error(`Transaction sent: ${hash}`);
      return {
        content: [{
          type: 'text',
          text: `Transaction sent.\nHash: ${hash}\nTo: ${to}\nValue: ${value} A0GI\nStatus: Pending confirmation...`,
        }],
      };
    } catch (error) {
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ── Contract Handlers ──────────────────────────────────────────────

  private async handleDeployContract(args: any) {
    if (!this.isWalletConnected) {
      throw new Error('No wallet connected. Use connect_wallet first.');
    }

    const { bytecode, constructorArgs = [] } = args;

    try {
      console.error(`Deploying contract with bytecode length: ${bytecode.length}`);
      const contractAddress = await this.networkClient.deployContract(bytecode, constructorArgs);
      console.error(`Contract deployed at: ${contractAddress}`);
      return {
        content: [{
          type: 'text',
          text: `Contract deployed.\nAddress: ${contractAddress}\nBytecode: ${bytecode.substring(0, 50)}...\nConstructor Args: ${JSON.stringify(constructorArgs)}`,
        }],
      };
    } catch (error) {
      throw new Error(`Contract deployment failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleAnalyzeContract(args: any) {
    const { address, mode = 'analyze' } = args || {};

    // Stats mode doesn't need an address
    if (mode === 'stats') {
      try {
        const analysisStats = this.contractAnalysisEngine.getStats();
        const toolStats = this.dynamicToolGenerator.getStats();
        const explorationStats = this.contractExplorer.getExplorationStats();
        return {
          content: [{
            type: 'text',
            text: `Contract Intelligence Statistics:\n\n` +
                  `Analysis Engine:\n` +
                  `  Contracts Analyzed: ${analysisStats.totalAnalyzed}\n` +
                  `  Verified Contracts: ${analysisStats.verifiedContracts}\n` +
                  `  Cached Contracts: ${analysisStats.cachedContracts}\n\n` +
                  `Tool Generator:\n` +
                  `  Contracts with Tools: ${toolStats.contractsWithTools}\n` +
                  `  Total Tools Generated: ${toolStats.totalTools}\n` +
                  `  Read: ${toolStats.toolsByCategory.read} | Write: ${toolStats.toolsByCategory.write} | Payable: ${toolStats.toolsByCategory.payable}\n\n` +
                  `Explorer:\n` +
                  `  Contracts Explored: ${explorationStats.totalExplored}\n` +
                  `  Risk Distribution: Low ${explorationStats.riskDistribution.low} | Medium ${explorationStats.riskDistribution.medium} | High ${explorationStats.riskDistribution.high} | Critical ${explorationStats.riskDistribution.critical}`,
          }],
        };
      } catch (error) {
        throw new Error(`Failed to get contract stats: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!address) {
      throw new Error('Address is required for this mode. Use mode "stats" for aggregate statistics.');
    }

    switch (mode) {
      case 'analyze': {
        try {
          const result = await this.contractAnalysisEngine.analyzeContract(address);
          if (!result.success) throw new Error(result.error || 'Contract analysis failed');
          const info = result.contractInfo!;
          return {
            content: [{
              type: 'text',
              text: `Contract Analysis for ${address}:\n\n` +
                    `Address: ${info.address}\n` +
                    `Verified: ${info.verified ? 'Yes' : 'No'}\n` +
                    `Functions: ${info.functions.length}\n` +
                    `Events: ${info.events.length}\n\n` +
                    `Functions:\n${info.functions.slice(0, 10).map(f =>
                      `  ${f.name}(${f.inputs.map(i => i.type).join(', ')}) - ${f.stateMutability}`
                    ).join('\n')}\n` +
                    `${info.functions.length > 10 ? `  ... and ${info.functions.length - 10} more\n` : ''}` +
                    `\nSuggestions:\n${result.suggestions.map(s => `  ${s}`).join('\n')}\n` +
                    `\nConfidence: ${Math.round(result.confidence * 100)}%`,
            }],
          };
        } catch (error) {
          throw new Error(`Contract analysis failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      case 'explore': {
        const { includeTools = false } = args;
        try {
          const result = await this.contractExplorer.exploreContracts({ address, includeTools });
          if (!result.success || result.contracts.length === 0) {
            throw new Error(result.error || 'Contract exploration failed');
          }
          const contractData = result.contracts[0];
          const info = contractData.contractInfo;
          const risk = contractData.riskAssessment;
          return {
            content: [{
              type: 'text',
              text: `Contract Exploration for ${address}:\n\n` +
                    `Verified: ${info.verified ? 'Yes' : 'No'}\n` +
                    `Functions: ${info.functions.length} | Events: ${info.events.length}\n\n` +
                    `Risk Assessment:\n` +
                    `  Level: ${risk.level.toUpperCase()}\n` +
                    `  Score: ${risk.score}/100\n` +
                    `  Factors: ${risk.factors.length}\n\n` +
                    `Generated Tools: ${contractData.generatedTools?.length || 0}\n\n` +
                    `Recommendations:\n${risk.recommendations.map(r => `  ${r}`).join('\n')}`,
            }],
          };
        } catch (error) {
          throw new Error(`Contract exploration failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      case 'generate_tools': {
        const {
          includeReadFunctions = true,
          includeWriteFunctions = true,
          maxTools = 25,
        } = args;
        try {
          const analysisResult = await this.contractAnalysisEngine.analyzeContract(address);
          if (!analysisResult.success || !analysisResult.contractInfo) {
            throw new Error(analysisResult.error || 'Contract analysis failed');
          }
          const result = await this.dynamicToolGenerator.generateToolsForContract(
            analysisResult.contractInfo,
            { includeReadFunctions, includeWriteFunctions, maxToolsPerContract: maxTools }
          );
          if (!result.success) throw new Error(result.error || 'Tool generation failed');

          const readTools = result.tools.filter(t => t.metadata.category === 'read').length;
          const writeTools = result.tools.filter(t => t.metadata.category === 'write').length;
          const payableTools = result.tools.filter(t => t.metadata.category === 'payable').length;

          return {
            content: [{
              type: 'text',
              text: `Tool Generation for ${address}:\n\n` +
                    `Tools Generated: ${result.tools.length}\n` +
                    `  Read: ${readTools} | Write: ${writeTools} | Payable: ${payableTools}\n\n` +
                    `Tool Names:\n${result.tools.slice(0, 10).map(t =>
                      `  ${t.name} - ${t.metadata.category}`
                    ).join('\n')}\n` +
                    `${result.tools.length > 10 ? `  ... and ${result.tools.length - 10} more\n` : ''}` +
                    `${result.warnings.length > 0 ? `\nWarnings:\n${result.warnings.map(w => `  ${w}`).join('\n')}` : ''}`,
            }],
          };
        } catch (error) {
          throw new Error(`Tool generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      case 'test': {
        const {
          includeFunctionTests = true,
          includeSecurityTests = true,
          includeGasAnalysis = true,
        } = args;
        try {
          const result = await this.testingFramework.testContract(address, {
            includeFunctionTests,
            includeSecurityTests,
            includeGasAnalysis,
          });
          return {
            content: [{
              type: 'text',
              text: `Contract Test Results for ${address}:\n\n` +
                    `Tests: ${result.totalTests} total, ${result.passedTests} passed, ${result.failedTests} failed\n` +
                    `Success Rate: ${Math.round((result.passedTests / result.totalTests) * 100)}%\n` +
                    `Execution Time: ${result.totalExecutionTime / 1000}s\n` +
                    `Gas Used: ${result.totalGasUsed}\n\n` +
                    `Coverage:\n` +
                    `  Functions: ${result.coverage.functionsTested}/${result.coverage.functionsTotal} (${result.coverage.coveragePercentage}%)\n` +
                    `${result.coverage.functionsUntested.length > 0 ?
                      `  Untested: ${result.coverage.functionsUntested.join(', ')}\n` : ''}` +
                    `\nRecommendations:\n${result.recommendations.map(r => `  ${r}`).join('\n')}`,
            }],
          };
        } catch (error) {
          throw new Error(`Contract testing failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      default:
        throw new Error(`Unknown analyze_contract mode: "${mode}". Use: analyze, explore, generate_tools, test, stats.`);
    }
  }

  private async handleRunWorkflow(args: any) {
    const { workflowId, parameters = {} } = args || {};

    // No workflowId → list workflows
    if (!workflowId) {
      try {
        const workflows = this.workflowEngine.getAvailableWorkflows();
        return {
          content: [{
            type: 'text',
            text: `Available Workflows:\n\n` +
                  workflows.map(w =>
                    `${w.name} (${w.id})\n` +
                    `  ${w.description}\n` +
                    `  Category: ${w.category} | Steps: ${w.steps.length} | Est. Gas: ${w.totalEstimatedGas.toLocaleString()} | Risk: ${w.riskLevel.toUpperCase()}`
                  ).join('\n\n') +
                  `\n\nTotal: ${workflows.length} workflows`,
          }],
        };
      } catch (error) {
        throw new Error(`Failed to list workflows: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Execute workflow
    try {
      console.error(`Executing workflow: ${workflowId}`);
      const result = await this.workflowEngine.executeWorkflow(workflowId, parameters);
      const exec = result.execution;
      return {
        content: [{
          type: 'text',
          text: `Workflow Execution: ${workflowId}\n\n` +
                `Status: ${exec.status.toUpperCase()}\n` +
                `Time: ${(exec.endTime! - exec.startTime) / 1000}s\n` +
                `Completed: ${exec.completedSteps.length} | Failed: ${exec.failedSteps.length}\n` +
                `Gas Used: ${exec.totalGasUsed}\n` +
                `Transactions: ${exec.transactions.length}\n` +
                `${exec.transactions.length > 0 ?
                  `\nTransaction Hashes:\n${exec.transactions.map(tx =>
                    `  ${tx.transactionHash} (${tx.gasUsed} gas)`
                  ).join('\n')}\n` : ''}` +
                `${exec.errors.length > 0 ?
                  `\nErrors:\n${exec.errors.map(e => `  ${e}`).join('\n')}\n` : ''}` +
                `\nRecommendations:\n${result.recommendations.map(r => `  ${r}`).join('\n')}`,
        }],
      };
    } catch (error) {
      throw new Error(`Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ── Storage Handlers ───────────────────────────────────────────────

  private async handleUploadFile(args: any) {
    const { filePath, dryRun } = args;

    if (dryRun) {
      try {
        console.error(`Calculating Merkle root for: ${filePath}`);
        const rootHash = await this.storageClient.calculateMerkleRoot(filePath);
        return {
          content: [{
            type: 'text',
            text: `Merkle Root (dry run):\nFile: ${filePath}\nRoot Hash: ${rootHash}\n\nUse this hash to verify file integrity or check availability in 0G Storage.`,
          }],
        };
      } catch (error) {
        throw new Error(`Merkle root calculation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!this.isWalletConnected) {
      throw new Error('No wallet connected. Use connect_wallet first for storage operations.');
    }

    try {
      console.error(`Uploading file to 0G Storage: ${filePath}`);

      if (!this.storageClient.isWalletConnected()) {
        throw new Error('Storage client not connected. Please connect wallet first.');
      }

      const result = await this.storageClient.uploadFile(filePath);
      console.error(`File uploaded. Root hash: ${result.rootHash}`);

      return {
        content: [{
          type: 'text',
          text: `File uploaded to 0G Storage.\nRoot Hash: ${result.rootHash}\nTransaction Hash: ${result.txHash}\nFile Size: ${result.fileSize} bytes\nFile Name: ${result.fileName}\n\nSave this root hash to download the file later.`,
        }],
      };
    } catch (error) {
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleDownloadFile(args: any) {
    const { rootHash, outputPath, infoOnly } = args;

    // Info only mode — check file availability
    if (infoOnly) {
      try {
        const fileInfo = await this.storageClient.getFileInfo(rootHash);
        if (fileInfo.exists) {
          return {
            content: [{
              type: 'text',
              text: `File Information:\nRoot Hash: ${rootHash}\nStatus: Available in 0G Storage\nSize: ${fileInfo.size || 'Unknown'} bytes`,
            }],
          };
        } else {
          return {
            content: [{
              type: 'text',
              text: `File Information:\nRoot Hash: ${rootHash}\nStatus: Not found in 0G Storage`,
            }],
          };
        }
      } catch (error) {
        throw new Error(`Failed to get file info: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Download mode
    if (!outputPath) {
      throw new Error('outputPath is required for downloading. Use infoOnly: true to just check availability.');
    }

    try {
      console.error(`Downloading file from 0G Storage: ${rootHash}`);
      const result = await this.storageClient.downloadFile(rootHash, outputPath);
      console.error(`File downloaded to: ${result.filePath}`);
      return {
        content: [{
          type: 'text',
          text: `File downloaded from 0G Storage.\nRoot Hash: ${rootHash}\nOutput Path: ${result.filePath}\nVerification: ${result.verified ? 'Enabled' : 'Disabled'}`,
        }],
      };
    } catch (error) {
      throw new Error(`File download failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ── KV Storage Handlers ────────────────────────────────────────────

  private async handleStoreKVData(args: any) {
    if (!this.isWalletConnected) {
      throw new Error('Wallet not connected. Use connect_wallet first for KV storage operations.');
    }

    const { key, value, streamId } = args;

    try {
      console.error(`Storing data in 0G KV storage: ${key}`);
      const targetStreamId = streamId || 'user_data_v1';
      const dataBuffer = Buffer.from(value);
      const result = await this.kvStorageClient.setKV(key, value);

      return {
        content: [{
          type: 'text',
          text: `Data stored in 0G KV Storage.\nKey: ${key}\nStream: ${targetStreamId}\nSize: ${dataBuffer.length} bytes\nTransaction: ${result}`,
        }],
      };
    } catch (error) {
      throw new Error(`KV storage failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleRetrieveKVData(args: any) {
    const { key, streamId } = args;

    try {
      console.error(`Retrieving data from 0G KV storage: ${key}`);
      const targetStreamId = streamId || 'user_data_v1';
      const retrievedData = await this.kvStorageClient.getKV(key);
      const displayData = retrievedData !== null ? JSON.stringify(retrievedData) : '(no data found)';

      return {
        content: [{
          type: 'text',
          text: `Data from 0G KV Storage:\nKey: ${key}\nStream: ${targetStreamId}\nData: ${displayData}`,
        }],
      };
    } catch (error) {
      throw new Error(`KV retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ── AI Memory Handler ──────────────────────────────────────────────

  private async handleAIMemory(args: any) {
    const { action } = args;

    switch (action) {
      case 'init': {
        const { userId } = args;
        if (!userId) throw new Error('userId is required for "init" action.');
        try {
          this.currentUserId = userId;
          await this.aiStateManager.initializeUser(userId);
          return {
            content: [{
              type: 'text',
              text: `AI Assistant initialized for user: ${userId}\nLearning and memory system active.\nUsing 0G KV storage for persistence.`,
            }],
          };
        } catch (error) {
          throw new Error(`AI initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      case 'record': {
        const { userInput, assistantResponse, actionTaken, success, gasUsed, transactionHash } = args;
        if (!userInput || !assistantResponse || success === undefined) {
          throw new Error('userInput, assistantResponse, and success are required for "record" action.');
        }
        try {
          await this.aiStateManager.recordConversation(
            userInput, assistantResponse, actionTaken, success, gasUsed, transactionHash
          );
          return {
            content: [{
              type: 'text',
              text: `Conversation recorded.\nPattern analysis: ${success ? 'Success patterns learned' : 'Error patterns noted'}\nMemory updated.`,
            }],
          };
        } catch (error) {
          throw new Error(`Conversation recording failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      case 'suggestions': {
        const { context } = args;
        if (!context) throw new Error('context is required for "suggestions" action.');
        try {
          const suggestions = this.aiStateManager.getPersonalizedSuggestions(context);
          return {
            content: [{
              type: 'text',
              text: `Personalized Suggestions:\n\n${suggestions.length > 0 ? suggestions.join('\n\n') : 'No suggestions yet. Continue using the assistant to build personalized insights.'}`,
            }],
          };
        } catch (error) {
          throw new Error(`Suggestion generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      case 'insights': {
        try {
          const insights = await this.aiStateManager.generateLearningInsights();
          const insightText = insights.length > 0
            ? insights.map(insight =>
                `${insight.pattern}:\n` +
                `  Frequency: ${insight.frequency} uses\n` +
                `  Success Rate: ${(insight.success_rate * 100).toFixed(1)}%\n` +
                `  Gas Optimization: ${insight.gas_optimization.toFixed(1)}%\n` +
                `  Recommendation: ${insight.recommendation}`
              ).join('\n\n')
            : 'Continue using the assistant to generate learning insights.';
          return {
            content: [{ type: 'text', text: `AI Learning Insights:\n\n${insightText}` }],
          };
        } catch (error) {
          throw new Error(`Learning insights failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      case 'update_preferences': {
        const { preferences } = args;
        if (!preferences) throw new Error('preferences object is required for "update_preferences" action.');
        try {
          await this.aiStateManager.updateUserPreferences(preferences);
          return {
            content: [{
              type: 'text',
              text: `User preferences updated.\nSettings applied to AI assistant.\nPreferences saved to 0G KV storage.`,
            }],
          };
        } catch (error) {
          throw new Error(`Preference update failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      case 'stats': {
        try {
          const stats = this.aiStateManager.getMemoryStats();
          return {
            content: [{
              type: 'text',
              text: `AI Memory Statistics:\n\n` +
                    `User: ${stats.userId || 'Not initialized'}\n` +
                    `Short-term Memory: ${stats.shortTermMemory} conversations\n` +
                    `Learned Patterns: ${stats.longTermPatterns} patterns\n` +
                    `Contract Knowledge: ${stats.contractKnowledge} contracts\n` +
                    `Learning Status: ${stats.learningEnabled ? 'Active' : 'Disabled'}\n\n` +
                    `Utilization:\n` +
                    `  Short-term: ${stats.memoryUtilization.shortTerm}\n` +
                    `  Long-term: ${stats.memoryUtilization.longTerm} patterns\n` +
                    `  Avg Pattern Confidence: ${(stats.memoryUtilization.avgPatternConfidence * 100).toFixed(1)}%`,
            }],
          };
        } catch (error) {
          throw new Error(`Memory stats failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      default:
        throw new Error(`Unknown ai_memory action: "${action}". Use: init, record, suggestions, insights, update_preferences, stats.`);
    }
  }

  // ── Documentation Handler ──────────────────────────────────────────

  private async handle0GDocs(args: any) {
    const { action } = args;

    switch (action) {
      case 'updates': {
        try {
          const updateCheck = await this.knowledgeEngine.checkForUpdates();
          return {
            content: [{
              type: 'text',
              text: `0G Update Check\n\n` +
                    `Status: ${updateCheck.hasUpdates ? 'Updates found' : 'No new updates'}\n` +
                    `${updateCheck.updates.length > 0 ?
                      `\nRecent Updates:\n${updateCheck.updates.map(u => `  ${u}`).join('\n')}\n` : ''}` +
                    `\nLast checked: ${new Date().toLocaleString()}`,
            }],
          };
        } catch (error) {
          throw new Error(`Failed to check 0G updates: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      case 'latest': {
        try {
          const latest = await this.knowledgeEngine.getLatest0GUpdates();
          return {
            content: [{
              type: 'text',
              text: `Latest 0G Information\n\n` +
                    `Releases (${latest.releases.length}):\n${
                      latest.releases.slice(0, 5).map(r =>
                        `  ${r.name || 'Unnamed'} (${r.tag_name || 'No tag'}) - ${r.published_at ? new Date(r.published_at).toLocaleDateString() : 'Unknown date'}`
                      ).join('\n')
                    }\n\n` +
                    `Documentation (${latest.documentation.length}):\n${
                      latest.documentation.slice(0, 3).map(d => `  ${d}`).join('\n')
                    }\n\n` +
                    `Tutorials (${latest.tutorials.length}):\n${
                      latest.tutorials.slice(0, 3).map(t => `  ${t}`).join('\n')
                    }`,
            }],
          };
        } catch (error) {
          throw new Error(`Failed to get latest 0G info: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      case 'search': {
        const { query } = args;
        if (!query) throw new Error('query is required for "search" action.');
        try {
          const results = await this.knowledgeEngine.search0GDocumentation(query);
          return {
            content: [{
              type: 'text',
              text: `0G Documentation Search\n\n` +
                    `Query: "${query}"\n` +
                    `Results: ${results.length}\n\n` +
                    `${results.length > 0 ?
                      `Matches:\n${results.map(r => `  ${r}`).join('\n')}` :
                      `No matches found.\n\nTry: "storage", "compute", "sdk", "smart contract"`}`,
            }],
          };
        } catch (error) {
          throw new Error(`Failed to search 0G docs: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      case 'learning_path': {
        const { skillLevel } = args;
        if (!skillLevel) throw new Error('skillLevel is required for "learning_path" action.');
        try {
          const learningPath = await this.knowledgeEngine.generateLearningPath(skillLevel);
          return {
            content: [{
              type: 'text',
              text: `0G Learning Path - ${skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)}\n\n` +
                    `Estimated time: ${learningPath.estimatedTime}\n\n` +
                    `Prerequisites:\n${learningPath.prerequisites.map(p => `  ${p}`).join('\n')}\n\n` +
                    `Path:\n${learningPath.path.map(step => `  ${step}`).join('\n')}\n\n` +
                    `Resources:\n  Docs: https://docs.0g.ai\n  SDK: https://github.com/0glabs/0g-ts-sdk\n  Explorer: https://chainscan-galileo.0g.ai`,
            }],
          };
        } catch (error) {
          throw new Error(`Failed to generate learning path: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      case 'examples': {
        const { category } = args;
        if (!category) throw new Error('category is required for "examples" action.');
        const examples: Record<string, string[]> = {
          storage: [
            'File Upload: https://github.com/0glabs/0g-ts-sdk/blob/main/examples/storage-upload.ts',
            'File Download: https://github.com/0glabs/0g-ts-sdk/blob/main/examples/storage-download.ts',
            'Merkle Verification: Basic file integrity verification',
            'Batch Operations: Uploading multiple files efficiently',
          ],
          compute: [
            'AI Model Deployment: Deploy machine learning models',
            'Inference Requests: Execute AI model inference',
            'Model Updates: Update deployed AI models',
            'Performance Monitoring: Track AI compute usage',
          ],
          contracts: [
            'ERC20 Token: https://github.com/0glabs/0g-chain/tree/main/tests/contracts',
            'NFT Contract: Basic ERC721 implementation',
            'Marketplace: Simple NFT marketplace contract',
            'Multisig Wallet: Multi-signature wallet example',
          ],
          sdk: [
            'Quick Start: https://github.com/0glabs/0g-ts-sdk/blob/main/examples/quickstart.ts',
            'Network Connection: Connect to 0G network',
            'Wallet Integration: Connect and use wallets',
            'Event Listening: Listen to blockchain events',
          ],
        };

        const categoryExamples = examples[category] || [];
        return {
          content: [{
            type: 'text',
            text: `0G ${category.charAt(0).toUpperCase() + category.slice(1)} Examples\n\n` +
                  `${categoryExamples.map(e => `  ${e}`).join('\n')}\n\n` +
                  `Resources:\n  SDK: https://github.com/0glabs/0g-ts-sdk\n  Docs: https://docs.0g.ai\n  Testnet: 0G Galileo (Chain ID: 16602)`,
          }],
        };
      }

      default:
        throw new Error(`Unknown 0g_docs action: "${action}". Use: updates, latest, search, learning_path, examples.`);
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
