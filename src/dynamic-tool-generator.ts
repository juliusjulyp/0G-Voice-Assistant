import { ethers } from 'ethers';
import { ContractInfo, ContractFunction } from './contract-analysis-engine.js';
import { OGNetworkClient } from './network-client.js';

export interface GeneratedTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
  metadata: {
    contractAddress: string;
    functionName: string;
    gasEstimate: number;
    category: 'read' | 'write' | 'payable';
  };
}

export interface ToolGenerationOptions {
  includeReadFunctions: boolean;
  includeWriteFunctions: boolean;
  includePayableFunctions: boolean;
  maxToolsPerContract: number;
  customPrefix?: string;
}

export interface GenerationResult {
  success: boolean;
  tools: GeneratedTool[];
  contractAddress: string;
  contractName?: string;
  warnings: string[];
  error?: string;
}

export class DynamicToolGenerator {
  private networkClient: OGNetworkClient;
  private generatedTools: Map<string, GeneratedTool[]> = new Map();
  
  constructor(networkClient: OGNetworkClient) {
    this.networkClient = networkClient;
  }

  /**
   * Generate MCP tools for a analyzed contract
   */
  async generateToolsForContract(
    contractInfo: ContractInfo,
    options: Partial<ToolGenerationOptions> = {}
  ): Promise<GenerationResult> {
    try {
      const opts: ToolGenerationOptions = {
        includeReadFunctions: true,
        includeWriteFunctions: true,
        includePayableFunctions: true,
        maxToolsPerContract: 25,
        ...options
      };

      console.log(`🔧 Generating tools for contract: ${contractInfo.address}`);

      const tools: GeneratedTool[] = [];
      const warnings: string[] = [];

      // Filter functions based on options
      const functionsToProcess = contractInfo.functions.filter(func => {
        if (func.type !== 'function') return false;
        
        if (func.stateMutability === 'view' || func.stateMutability === 'pure') {
          return opts.includeReadFunctions;
        } else if (func.stateMutability === 'payable') {
          return opts.includePayableFunctions;
        } else {
          return opts.includeWriteFunctions;
        }
      });

      // Limit number of tools
      if (functionsToProcess.length > opts.maxToolsPerContract) {
        warnings.push(`Contract has ${functionsToProcess.length} functions, limiting to ${opts.maxToolsPerContract} most important ones`);
        functionsToProcess.splice(opts.maxToolsPerContract);
      }

      // Generate tools for each function
      for (const func of functionsToProcess) {
        try {
          const tool = await this.generateToolForFunction(contractInfo, func, opts);
          tools.push(tool);
        } catch (error) {
          warnings.push(`Failed to generate tool for function ${func.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Generate aggregate tools for common patterns
      const aggregateTools = this.generateAggregateTools(contractInfo, opts);
      tools.push(...aggregateTools);

      // Cache the generated tools
      this.generatedTools.set(contractInfo.address, tools);

      console.log(`✅ Generated ${tools.length} tools for contract ${contractInfo.address}`);

      return {
        success: true,
        tools,
        contractAddress: contractInfo.address,
        contractName: contractInfo.name,
        warnings
      };

    } catch (error) {
      console.error('Tool generation error:', error);
      return {
        success: false,
        tools: [],
        contractAddress: contractInfo.address,
        warnings: [],
        error: error instanceof Error ? error.message : 'Unknown generation error'
      };
    }
  }

  /**
   * Generate a tool for a specific contract function
   */
  private async generateToolForFunction(
    contractInfo: ContractInfo,
    func: ContractFunction,
    options: ToolGenerationOptions
  ): Promise<GeneratedTool> {
    const toolName = this.generateToolName(contractInfo, func, options.customPrefix);
    const isReadFunction = func.stateMutability === 'view' || func.stateMutability === 'pure';
    
    return {
      name: toolName,
      description: this.generateToolDescription(contractInfo, func),
      inputSchema: this.generateInputSchema(func),
      handler: async (args: any) => {
        return await this.executeContractFunction(contractInfo, func, args, isReadFunction);
      },
      metadata: {
        contractAddress: contractInfo.address,
        functionName: func.name,
        gasEstimate: func.gasEstimate || 25000,
        category: isReadFunction ? 'read' : (func.stateMutability === 'payable' ? 'payable' : 'write')
      }
    };
  }

  /**
   * Generate tool name for a function
   */
  private generateToolName(
    contractInfo: ContractInfo,
    func: ContractFunction,
    customPrefix?: string
  ): string {
    const prefix = customPrefix || 'contract';
    const contractSuffix = contractInfo.name 
      ? contractInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
      : contractInfo.address.slice(2, 8);
    
    const functionName = func.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    return `${prefix}_${contractSuffix}_${functionName}`;
  }

  /**
   * Generate tool description for a function
   */
  private generateToolDescription(contractInfo: ContractInfo, func: ContractFunction): string {
    const contractName = contractInfo.name || `Contract ${contractInfo.address.slice(0, 8)}...`;
    const actionType = func.stateMutability === 'view' || func.stateMutability === 'pure' ? 'Query' : 'Execute';
    
    let description = `${actionType} ${func.name} function on ${contractName}`;
    
    if (func.documentation) {
      description += ` - ${func.documentation}`;
    }
    
    if (func.inputs.length > 0) {
      const inputTypes = func.inputs.map(input => `${input.name}(${input.type})`).join(', ');
      description += `. Inputs: ${inputTypes}`;
    }
    
    if (func.outputs.length > 0) {
      const outputTypes = func.outputs.map(output => output.type).join(', ');
      description += `. Returns: ${outputTypes}`;
    }
    
    if (func.stateMutability === 'payable') {
      description += '. ⚠️ This function requires ETH payment.';
    }
    
    return description;
  }

  /**
   * Generate JSON schema for function inputs
   */
  private generateInputSchema(func: ContractFunction): any {
    const properties: any = {};
    const required: string[] = [];
    
    // Add function parameters
    func.inputs.forEach((input, index) => {
      const paramName = input.name || `param${index}`;
      properties[paramName] = this.mapSolidityTypeToJsonSchema(input.type);
      properties[paramName].description = `${input.type} parameter for ${func.name}`;
      required.push(paramName);
    });
    
    // Add value parameter for payable functions
    if (func.stateMutability === 'payable') {
      properties.value = {
        type: 'string',
        description: 'ETH amount to send (in wei or ETH format like "1.5 ETH")',
        pattern: '^([0-9]+(\\.[0-9]+)?\\s*(ETH|eth|wei)?|[0-9]+)$'
      };
    }
    
    // Add gas parameters for write functions
    if (func.stateMutability !== 'view' && func.stateMutability !== 'pure') {
      properties.gasLimit = {
        type: 'number',
        description: 'Gas limit for transaction (optional)',
        minimum: 21000,
        maximum: 10000000
      };
      
      properties.gasPrice = {
        type: 'string',
        description: 'Gas price in gwei (optional, e.g., "20")'
      };
    }
    
    return {
      type: 'object',
      properties,
      required,
      additionalProperties: false
    };
  }

  /**
   * Map Solidity types to JSON Schema types
   */
  private mapSolidityTypeToJsonSchema(solidityType: string): any {
    // Handle arrays
    if (solidityType.includes('[]')) {
      const baseType = solidityType.replace('[]', '');
      return {
        type: 'array',
        items: this.mapSolidityTypeToJsonSchema(baseType)
      };
    }
    
    // Handle fixed-size arrays
    if (solidityType.match(/\[[0-9]+\]/)) {
      const baseType = solidityType.replace(/\[[0-9]+\]/, '');
      return {
        type: 'array',
        items: this.mapSolidityTypeToJsonSchema(baseType)
      };
    }
    
    // Handle basic types
    if (solidityType.startsWith('uint') || solidityType.startsWith('int')) {
      return {
        type: 'string',
        pattern: '^[0-9]+$',
        description: `${solidityType} integer as string`
      };
    }
    
    if (solidityType === 'address') {
      return {
        type: 'string',
        pattern: '^0x[a-fA-F0-9]{40}$',
        description: 'Ethereum address'
      };
    }
    
    if (solidityType === 'bool') {
      return {
        type: 'boolean',
        description: 'Boolean value'
      };
    }
    
    if (solidityType.startsWith('bytes')) {
      return {
        type: 'string',
        pattern: '^0x[a-fA-F0-9]*$',
        description: `${solidityType} as hex string`
      };
    }
    
    if (solidityType === 'string') {
      return {
        type: 'string',
        description: 'String value'
      };
    }
    
    // Default fallback
    return {
      type: 'string',
      description: `${solidityType} value`
    };
  }

  /**
   * Execute a contract function
   */
  private async executeContractFunction(
    contractInfo: ContractInfo,
    func: ContractFunction,
    args: any,
    isReadFunction: boolean
  ): Promise<any> {
    try {
      const provider = this.networkClient.getProvider();
      if (!provider) {
        throw new Error('Network provider not available');
      }

      // Create contract instance
      const contract = new ethers.Contract(contractInfo.address, contractInfo.abi, provider);
      
      // Prepare function arguments
      const functionArgs = this.prepareFunctionArguments(func, args);
      
      if (isReadFunction) {
        // Execute read function
        const contractFunction = contract.getFunction(func.name);
        const result = await contractFunction(...functionArgs);
        
        return {
          success: true,
          result: this.formatResult(result, func.outputs),
          gasUsed: 0,
          transactionHash: null,
          blockNumber: await provider.getBlockNumber()
        };
      } else {
        // Execute write function
        const signer = this.networkClient.getSigner();
        if (!signer) {
          throw new Error('Wallet not connected - required for write operations');
        }
        
        const contractWithSigner = contract.connect(signer);
        
        // Prepare transaction options
        const txOptions: any = {};
        
        if (args.value) {
          txOptions.value = this.parseValueAmount(args.value);
        }
        
        if (args.gasLimit) {
          txOptions.gasLimit = args.gasLimit;
        }
        
        if (args.gasPrice) {
          txOptions.gasPrice = ethers.parseUnits(args.gasPrice, 'gwei');
        }
        
        // Execute transaction
        console.log(`📝 Executing ${func.name} on contract ${contractInfo.address}`);
        const contractFunction = contractWithSigner.getFunction(func.name);
        const tx = await contractFunction(...functionArgs, txOptions);
        
        console.log(`⏳ Transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();
        
        return {
          success: true,
          result: 'Transaction successful',
          gasUsed: receipt.gasUsed.toString(),
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          logs: receipt.logs.length
        };
      }
      
    } catch (error) {
      console.error(`Contract function execution error:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        result: null,
        gasUsed: 0,
        transactionHash: null
      };
    }
  }

  /**
   * Prepare function arguments from user input
   */
  private prepareFunctionArguments(func: ContractFunction, args: any): any[] {
    return func.inputs.map((input, index) => {
      const paramName = input.name || `param${index}`;
      let value = args[paramName];
      
      // Convert based on type
      if (input.type.startsWith('uint') || input.type.startsWith('int')) {
        return value.toString();
      } else if (input.type === 'bool') {
        return Boolean(value);
      } else if (input.type === 'address') {
        return value.toLowerCase();
      }
      
      return value;
    });
  }

  /**
   * Parse value amount (ETH or wei)
   */
  private parseValueAmount(value: string): bigint {
    if (value.toLowerCase().includes('eth')) {
      const amount = value.replace(/[^0-9.]/g, '');
      return ethers.parseEther(amount);
    } else {
      return BigInt(value);
    }
  }

  /**
   * Format function result for display
   */
  private formatResult(result: any, outputs: any[]): any {
    if (outputs.length === 0) {
      return 'Success';
    }
    
    if (outputs.length === 1) {
      return this.formatSingleValue(result, outputs[0].type);
    }
    
    // Multiple outputs - return as object
    const formattedResult: any = {};
    outputs.forEach((output, index) => {
      const key = output.name || `output${index}`;
      formattedResult[key] = this.formatSingleValue(result[index], output.type);
    });
    
    return formattedResult;
  }

  /**
   * Format a single value based on its type
   */
  private formatSingleValue(value: any, type: string): any {
    if (type.startsWith('uint') || type.startsWith('int')) {
      return value.toString();
    } else if (type === 'bool') {
      return Boolean(value);
    } else if (type === 'address') {
      return value.toLowerCase();
    } else if (type.startsWith('bytes')) {
      return value;
    }
    
    return value;
  }

  /**
   * Generate aggregate tools for common contract patterns
   */
  private generateAggregateTools(contractInfo: ContractInfo, options: ToolGenerationOptions): GeneratedTool[] {
    const tools: GeneratedTool[] = [];
    
    // Contract info tool
    tools.push({
      name: `contract_${contractInfo.address.slice(2, 8)}_info`,
      description: `Get comprehensive information about contract at ${contractInfo.address}`,
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      },
      handler: async () => ({
        success: true,
        contractAddress: contractInfo.address,
        verified: contractInfo.verified,
        functionsCount: contractInfo.functions.length,
        eventsCount: contractInfo.events.length,
        functions: contractInfo.functions.map(f => ({
          name: f.name,
          type: f.stateMutability,
          inputs: f.inputs.length,
          outputs: f.outputs.length
        }))
      }),
      metadata: {
        contractAddress: contractInfo.address,
        functionName: 'getInfo',
        gasEstimate: 0,
        category: 'read'
      }
    });
    
    return tools;
  }

  /**
   * Get generated tools for a contract
   */
  getGeneratedTools(contractAddress: string): GeneratedTool[] {
    return this.generatedTools.get(contractAddress.toLowerCase()) || [];
  }

  /**
   * Get all generated tools
   */
  getAllGeneratedTools(): Map<string, GeneratedTool[]> {
    return new Map(this.generatedTools);
  }

  /**
   * Clear generated tools for a contract
   */
  clearToolsForContract(contractAddress: string): void {
    this.generatedTools.delete(contractAddress.toLowerCase());
  }

  /**
   * Clear all generated tools
   */
  clearAllTools(): void {
    this.generatedTools.clear();
  }

  /**
   * Get generation statistics
   */
  getStats(): { contractsWithTools: number; totalTools: number; toolsByCategory: Record<string, number> } {
    const contractsWithTools = this.generatedTools.size;
    let totalTools = 0;
    const toolsByCategory: Record<string, number> = { read: 0, write: 0, payable: 0 };
    
    for (const tools of this.generatedTools.values()) {
      totalTools += tools.length;
      tools.forEach(tool => {
        toolsByCategory[tool.metadata.category]++;
      });
    }
    
    return { contractsWithTools, totalTools, toolsByCategory };
  }
}

export default DynamicToolGenerator;