import KnowledgeIngestionEngine, { ContractKnowledge, SmartContractPattern } from './knowledge-ingestion.js';
import { OGNetworkClient } from './network-client.js';
import OGStorageClient from './storage-client.js';

export interface TaskRequest {
  userInput: string;
  context?: any;
  priority: 'low' | 'medium' | 'high';
}

export interface ExecutableAction {
  type: 'deploy_contract' | 'call_function' | 'upload_storage' | 'query_blockchain' | 'analyze_contract' | 'custom';
  description: string;
  steps: ActionStep[];
  estimatedGas?: string;
  requirements: string[];
  warnings: string[];
}

export interface ActionStep {
  id: string;
  action: string;
  parameters: any;
  dependencies: string[];
  description: string;
  toolName?: string;
  optional: boolean;
}

export interface TaskResult {
  success: boolean;
  result: any;
  gasUsed?: string;
  transactionHash?: string;
  warnings: string[];
  suggestions: string[];
}

export class TaskInterpreter {
  private knowledgeEngine: KnowledgeIngestionEngine;
  private networkClient: OGNetworkClient;
  private storageClient: OGStorageClient;
  
  // Intent patterns for natural language processing
  private readonly INTENT_PATTERNS = {
    deploy: /deploy|create|launch|initialize/i,
    call: /call|execute|run|invoke/i,
    query: /query|check|get|read|view|balance|status/i,
    upload: /upload|store|save|put/i,
    analyze: /analyze|scan|inspect|examine|audit/i,
    transfer: /send|transfer|pay|move/i,
    approve: /approve|allow|permit/i,
    monitor: /monitor|watch|listen|track/i
  };

  private readonly ENTITY_PATTERNS = {
    contract: /contract|smart\s*contract/i,
    token: /token|erc20|erc721|nft/i,
    function: /function|method/i,
    address: /(0x[a-fA-F0-9]{40})/g,
    amount: /(\d+(?:\.\d+)?)\s*(eth|ether|gwei|wei|tokens?)/i,
    file: /file|document|data/i,
    model: /model|ai\s*model|ml\s*model/i
  };

  constructor(
    knowledgeEngine: KnowledgeIngestionEngine,
    networkClient: OGNetworkClient,
    storageClient: OGStorageClient
  ) {
    this.knowledgeEngine = knowledgeEngine;
    this.networkClient = networkClient;
    this.storageClient = storageClient;
  }

  /**
   * Interpret user request and convert to executable actions
   */
  async interpretTask(request: TaskRequest): Promise<ExecutableAction> {
    console.log(`🤖 Interpreting task: "${request.userInput}"`);
    
    // Parse intent and entities from user input
    const intent = this.extractIntent(request.userInput);
    const entities = this.extractEntities(request.userInput);
    
    console.log(`🎯 Detected intent: ${intent}`);
    console.log(`📝 Extracted entities:`, entities);

    // Search knowledge base for relevant information
    const knowledgeResults = this.knowledgeEngine.searchKnowledge(request.userInput);
    
    // Generate executable action based on intent
    const action = await this.generateAction(intent, entities, knowledgeResults, request);
    
    console.log(`⚡ Generated action: ${action.type}`);
    return action;
  }

  /**
   * Execute the interpreted action
   */
  async executeAction(action: ExecutableAction): Promise<TaskResult> {
    console.log(`🚀 Executing action: ${action.type}`);
    
    const result: TaskResult = {
      success: false,
      result: null,
      warnings: [...action.warnings],
      suggestions: []
    };

    try {
      // Execute steps in order
      for (const step of action.steps) {
        console.log(`📋 Executing step: ${step.description}`);
        
        // Check dependencies
        if (!this.checkDependencies(step.dependencies)) {
          if (!step.optional) {
            throw new Error(`Missing dependencies for step: ${step.id}`);
          }
          console.log(`⏭️  Skipping optional step: ${step.id}`);
          continue;
        }

        // Execute the step
        const stepResult = await this.executeStep(step, action.type);
        
        if (stepResult.transactionHash) {
          result.transactionHash = stepResult.transactionHash;
        }
        if (stepResult.gasUsed) {
          result.gasUsed = stepResult.gasUsed;
        }
      }

      result.success = true;
      result.result = "Action completed successfully";
      
    } catch (error) {
      result.success = false;
      result.result = error instanceof Error ? error.message : String(error);
      result.warnings.push(`Execution failed: ${result.result}`);
    }

    return result;
  }

  /**
   * Extract intent from user input
   */
  private extractIntent(userInput: string): string {
    const lowerInput = userInput.toLowerCase();
    
    for (const [intent, pattern] of Object.entries(this.INTENT_PATTERNS)) {
      if (pattern.test(lowerInput)) {
        return intent;
      }
    }
    
    return 'query'; // Default to query if no specific intent found
  }

  /**
   * Extract entities from user input
   */
  private extractEntities(userInput: string): any {
    const entities: any = {};
    
    // Extract addresses
    const addresses = userInput.match(this.ENTITY_PATTERNS.address);
    if (addresses) {
      entities.addresses = addresses;
    }
    
    // Extract amounts
    const amountMatch = userInput.match(this.ENTITY_PATTERNS.amount);
    if (amountMatch) {
      entities.amount = {
        value: amountMatch[1],
        unit: amountMatch[2]
      };
    }
    
    // Extract entity types
    for (const [entityType, pattern] of Object.entries(this.ENTITY_PATTERNS)) {
      if (pattern.test(userInput)) {
        entities[entityType] = true;
      }
    }
    
    return entities;
  }

  /**
   * Generate executable action based on intent and entities
   */
  private async generateAction(
    intent: string,
    entities: any,
    knowledgeResults: any[],
    request: TaskRequest
  ): Promise<ExecutableAction> {
    
    switch (intent) {
      case 'deploy':
        return await this.generateDeployAction(entities, knowledgeResults, request);
      
      case 'call':
        return await this.generateCallAction(entities, knowledgeResults, request);
      
      case 'query':
        return await this.generateQueryAction(entities, knowledgeResults, request);
      
      case 'upload':
        return await this.generateUploadAction(entities, knowledgeResults, request);
      
      case 'analyze':
        return await this.generateAnalyzeAction(entities, knowledgeResults, request);
      
      case 'transfer':
        return await this.generateTransferAction(entities, knowledgeResults, request);
      
      default:
        return this.generateCustomAction(intent, entities, knowledgeResults, request);
    }
  }

  /**
   * Generate contract deployment action
   */
  private async generateDeployAction(
    entities: any,
    knowledgeResults: any[],
    request: TaskRequest
  ): Promise<ExecutableAction> {
    
    // Determine contract type to deploy
    let contractPattern: SmartContractPattern | undefined;
    
    if (entities.token) {
      contractPattern = this.knowledgeEngine.getDeploymentPattern('BasicERC20');
    } else {
      // Search for relevant patterns in knowledge base
      const patterns = this.knowledgeEngine.getAllDeploymentPatterns();
      contractPattern = patterns[0]; // Use first available pattern
    }
    
    if (!contractPattern) {
      throw new Error('No suitable deployment pattern found');
    }

    const steps: ActionStep[] = [
      {
        id: 'compile_contract',
        action: 'compile',
        parameters: {
          sourceCode: contractPattern.template,
          solcVersion: '0.8.19'
        },
        dependencies: [],
        description: `Compile ${contractPattern.name} contract`,
        optional: false
      },
      {
        id: 'estimate_deployment_gas',
        action: 'estimate_gas',
        parameters: {
          bytecode: 'compiled_bytecode'
        },
        dependencies: ['compile_contract'],
        description: 'Estimate deployment gas cost',
        optional: true
      },
      {
        id: 'deploy_contract',
        action: 'deploy',
        parameters: {
          bytecode: 'compiled_bytecode',
          constructorArgs: this.extractConstructorArgs(entities, contractPattern)
        },
        dependencies: ['compile_contract'],
        description: `Deploy ${contractPattern.name} to 0G network`,
        toolName: 'deploy_contract',
        optional: false
      }
    ];

    return {
      type: 'deploy_contract',
      description: `Deploy ${contractPattern.name} smart contract`,
      steps,
      estimatedGas: contractPattern.gasEstimate,
      requirements: ['Wallet connected', 'Sufficient balance', ...contractPattern.dependencies],
      warnings: contractPattern.securityNotes
    };
  }

  /**
   * Generate function call action
   */
  private async generateCallAction(
    entities: any,
    knowledgeResults: any[],
    request: TaskRequest
  ): Promise<ExecutableAction> {
    
    // Find contract address from entities or knowledge base
    const contractAddress = entities.addresses?.[0];
    if (!contractAddress) {
      throw new Error('Contract address required for function call');
    }
    
    // Get contract knowledge
    const contractKnowledge = this.knowledgeEngine.getContractKnowledge(contractAddress);
    if (!contractKnowledge) {
      throw new Error(`Contract ${contractAddress} not found in knowledge base`);
    }

    // Determine function to call based on user input
    const functionName = this.extractFunctionName(request.userInput, contractKnowledge);
    const targetFunction = contractKnowledge.functions.find(f => f.name === functionName);
    
    if (!targetFunction) {
      throw new Error(`Function ${functionName} not found in contract`);
    }

    const steps: ActionStep[] = [
      {
        id: 'call_function',
        action: 'call_contract_function',
        parameters: {
          contractAddress,
          functionName: targetFunction.name,
          args: this.extractFunctionArgs(entities, targetFunction)
        },
        dependencies: [],
        description: `Call ${targetFunction.name} on contract ${contractAddress}`,
        toolName: `call_${contractKnowledge.name}_${targetFunction.name}`,
        optional: false
      }
    ];

    return {
      type: 'call_function',
      description: `Call ${targetFunction.name} function`,
      steps,
      requirements: ['Contract exists', 'Valid parameters'],
      warnings: targetFunction.stateMutability === 'nonpayable' ? ['This function modifies state'] : []
    };
  }

  /**
   * Generate query action for reading blockchain data
   */
  private async generateQueryAction(
    entities: any,
    knowledgeResults: any[],
    request: TaskRequest
  ): Promise<ExecutableAction> {
    
    const steps: ActionStep[] = [];
    
    if (entities.addresses) {
      // Query address information
      for (const address of entities.addresses) {
        steps.push({
          id: `query_${address}`,
          action: 'get_balance',
          parameters: { address },
          dependencies: [],
          description: `Get balance for ${address}`,
          toolName: 'get_balance',
          optional: false
        });
      }
    } else {
      // General network query
      steps.push({
        id: 'query_network',
        action: 'get_network_info',
        parameters: {},
        dependencies: [],
        description: 'Get network information',
        toolName: 'get_network_info',
        optional: false
      });
    }

    return {
      type: 'query_blockchain',
      description: 'Query blockchain data',
      steps,
      requirements: ['Network connection'],
      warnings: []
    };
  }

  /**
   * Generate storage upload action
   */
  private async generateUploadAction(
    entities: any,
    knowledgeResults: any[],
    request: TaskRequest
  ): Promise<ExecutableAction> {
    
    // Extract file path from user input
    const filePath = this.extractFilePath(request.userInput);
    
    const steps: ActionStep[] = [
      {
        id: 'upload_file',
        action: 'upload_file_to_storage',
        parameters: { filePath },
        dependencies: [],
        description: `Upload file to 0G Storage`,
        toolName: 'upload_file_to_storage',
        optional: false
      }
    ];

    return {
      type: 'upload_storage',
      description: 'Upload file to 0G Storage',
      steps,
      requirements: ['Wallet connected', 'File exists'],
      warnings: ['Storage costs apply', 'File will be publicly accessible']
    };
  }

  /**
   * Generate contract analysis action
   */
  private async generateAnalyzeAction(
    entities: any,
    knowledgeResults: any[],
    request: TaskRequest
  ): Promise<ExecutableAction> {
    
    const contractAddress = entities.addresses?.[0];
    
    const steps: ActionStep[] = [
      {
        id: 'analyze_contract',
        action: 'analyze_contract_bytecode',
        parameters: { contractAddress },
        dependencies: [],
        description: `Analyze contract at ${contractAddress}`,
        optional: false
      }
    ];

    return {
      type: 'analyze_contract',
      description: 'Analyze smart contract',
      steps,
      requirements: ['Valid contract address'],
      warnings: ['Analysis is based on bytecode only']
    };
  }

  /**
   * Generate transfer action
   */
  private async generateTransferAction(
    entities: any,
    knowledgeResults: any[],
    request: TaskRequest
  ): Promise<ExecutableAction> {
    
    const toAddress = entities.addresses?.[0];
    const amount = entities.amount?.value || '0.1';
    
    const steps: ActionStep[] = [
      {
        id: 'send_transaction',
        action: 'send_transaction',
        parameters: {
          to: toAddress,
          value: amount
        },
        dependencies: [],
        description: `Send ${amount} A0GI to ${toAddress}`,
        toolName: 'send_transaction',
        optional: false
      }
    ];

    return {
      type: 'call_function',
      description: `Transfer ${amount} A0GI`,
      steps,
      requirements: ['Wallet connected', 'Sufficient balance'],
      warnings: ['Transaction is irreversible']
    };
  }

  /**
   * Generate custom action for unknown intents
   */
  private generateCustomAction(
    intent: string,
    entities: any,
    knowledgeResults: any[],
    request: TaskRequest
  ): ExecutableAction {
    
    return {
      type: 'custom',
      description: `Custom action for: ${request.userInput}`,
      steps: [{
        id: 'custom_action',
        action: 'execute_custom',
        parameters: { userInput: request.userInput },
        dependencies: [],
        description: 'Execute custom action',
        optional: false
      }],
      requirements: ['Further clarification needed'],
      warnings: ['Action not fully understood']
    };
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: ActionStep, actionType: string): Promise<any> {
    // This would integrate with the actual MCP tools
    console.log(`⚙️  Executing: ${step.action} with params:`, step.parameters);
    
    // Mock execution - in real implementation, call actual tools
    return {
      success: true,
      result: `Step ${step.id} completed`,
      transactionHash: step.action.includes('deploy') || step.action.includes('send') ? 
        `0x${Math.random().toString(16).substr(2, 8)}...` : undefined
    };
  }

  /**
   * Check if dependencies are met
   */
  private checkDependencies(dependencies: string[]): boolean {
    // Check if required dependencies are available
    // For now, return true - in real implementation, check actual dependencies
    return true;
  }

  /**
   * Extract constructor arguments from entities and pattern
   */
  private extractConstructorArgs(entities: any, pattern: SmartContractPattern): any[] {
    // Extract constructor arguments based on pattern and user input
    // This is simplified - would need more sophisticated parsing
    return [];
  }

  /**
   * Extract function name from user input
   */
  private extractFunctionName(userInput: string, contractKnowledge: ContractKnowledge): string {
    // Simple function name extraction
    const functionNames = contractKnowledge.functions.map(f => f.name);
    
    for (const funcName of functionNames) {
      if (userInput.toLowerCase().includes(funcName.toLowerCase())) {
        return funcName;
      }
    }
    
    return functionNames[0] || 'unknown';
  }

  /**
   * Extract function arguments from entities
   */
  private extractFunctionArgs(entities: any, functionABI: any): any[] {
    // Extract function arguments based on entities and function signature
    // This is simplified - would need more sophisticated parameter matching
    return [];
  }

  /**
   * Extract file path from user input
   */
  private extractFilePath(userInput: string): string {
    // Extract file path from user input
    const pathMatch = userInput.match(/["']([^"']+)["']/) || userInput.match(/(\S+\.\w+)/);
    return pathMatch ? pathMatch[1] : './example.txt';
  }
}

export default TaskInterpreter;