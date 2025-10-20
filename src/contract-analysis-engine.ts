import { ethers } from 'ethers';
import { OGNetworkClient } from './network-client.js';

export interface ContractInfo {
  address: string;
  abi: any[];
  name?: string;
  verified: boolean;
  bytecode: string;
  functions: ContractFunction[];
  events: ContractEvent[];
  constructorFunction?: ContractFunction;
  deploymentBlock?: number;
  deploymentTx?: string;
  deploymentTimestamp?: number;
}

export interface ContractFunction {
  name: string;
  type: 'function' | 'constructor' | 'fallback' | 'receive';
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
  inputs: FunctionParameter[];
  outputs: FunctionParameter[];
  signature: string;
  selector: string;
  documentation?: string;
  gasEstimate?: number;
}

export interface ContractEvent {
  name: string;
  inputs: EventParameter[];
  signature: string;
  topic: string;
  anonymous: boolean;
}

export interface FunctionParameter {
  name: string;
  type: string;
  internalType?: string;
  components?: FunctionParameter[];
}

export interface EventParameter {
  name: string;
  type: string;
  indexed: boolean;
  internalType?: string;
}

export interface AnalysisResult {
  success: boolean;
  contractInfo?: ContractInfo;
  error?: string;
  suggestions: string[];
  confidence: number;
}

export interface ContractPattern {
  name: string;
  description: string;
  functions: string[];
  events: string[];
  confidence: number;
}

export class ContractAnalysisEngine {
  private networkClient: OGNetworkClient;
  private contractCache: Map<string, ContractInfo> = new Map();
  private knownPatterns: ContractPattern[] = [];
  
  constructor(networkClient: OGNetworkClient) {
    this.networkClient = networkClient;
    this.initializeKnownPatterns();
  }

  /**
   * Analyze a contract at a given address
   */
  async analyzeContract(address: string): Promise<AnalysisResult> {
    try {
      // Check cache first
      if (this.contractCache.has(address)) {
        return {
          success: true,
          contractInfo: this.contractCache.get(address)!,
          suggestions: this.generateSuggestions(this.contractCache.get(address)!),
          confidence: 0.95
        };
      }

      console.log(`🔍 Analyzing contract at address: ${address}`);

      // Validate address format
      if (!ethers.isAddress(address)) {
        return {
          success: false,
          error: 'Invalid contract address format',
          suggestions: ['Please provide a valid Ethereum address format (0x...)'],
          confidence: 0
        };
      }

      // Get provider from network client
      const provider = this.networkClient.getProvider();
      if (!provider) {
        throw new Error('Network provider not available');
      }

      // Check if contract exists
      const code = await provider.getCode(address);
      if (code === '0x') {
        return {
          success: false,
          error: 'No contract found at this address',
          suggestions: [
            'Verify the contract address is correct',
            'Check if the contract is deployed on the correct network',
            'Try deploying a contract first'
          ],
          confidence: 0
        };
      }

      // Get basic contract info
      const contractInfo: ContractInfo = {
        address: address.toLowerCase(),
        abi: [],
        verified: false,
        bytecode: code,
        functions: [],
        events: []
      };

      // Try to extract ABI if contract is verified
      await this.tryExtractVerifiedABI(contractInfo);

      // If no verified ABI, try to reverse engineer basic info
      if (contractInfo.abi.length === 0) {
        await this.reverseEngineerContract(contractInfo);
      }

      // Analyze functions and events
      this.analyzeFunctions(contractInfo);
      this.analyzeEvents(contractInfo);

      // Get deployment information
      await this.getDeploymentInfo(contractInfo);

      // Identify contract patterns
      const patterns = this.identifyPatterns(contractInfo);
      
      // Cache the result
      this.contractCache.set(address, contractInfo);

      return {
        success: true,
        contractInfo,
        suggestions: this.generateSuggestions(contractInfo, patterns),
        confidence: contractInfo.verified ? 0.95 : 0.75
      };

    } catch (error) {
      console.error('Contract analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown analysis error',
        suggestions: [
          'Check network connection',
          'Verify contract address',
          'Try again in a moment'
        ],
        confidence: 0
      };
    }
  }

  /**
   * Try to extract verified ABI from contract explorers
   */
  private async tryExtractVerifiedABI(contractInfo: ContractInfo): Promise<void> {
    try {
      // This is a placeholder for actual verification sources
      // In a real implementation, you would:
      // 1. Check 0G's block explorer API
      // 2. Check other verification sources
      // 3. Parse the ABI if available
      
      console.log(`🔍 Checking for verified ABI for ${contractInfo.address}`);
      
      // For now, we'll mark as unverified and continue
      contractInfo.verified = false;
    } catch (error) {
      console.warn('Failed to fetch verified ABI:', error);
      contractInfo.verified = false;
    }
  }

  /**
   * Reverse engineer contract structure from bytecode
   */
  private async reverseEngineerContract(contractInfo: ContractInfo): Promise<void> {
    try {
      console.log(`🔧 Reverse engineering contract structure for ${contractInfo.address}`);
      
      // Extract function selectors from bytecode
      const selectors = this.extractFunctionSelectors(contractInfo.bytecode);
      
      // Create placeholder functions for discovered selectors
      contractInfo.functions = selectors.map(selector => ({
        name: `function_${selector}`,
        type: 'function' as const,
        stateMutability: 'nonpayable' as const,
        inputs: [],
        outputs: [],
        signature: `function_${selector}()`,
        selector: selector
      }));

      // Generate a basic ABI for discovered functions
      contractInfo.abi = contractInfo.functions.map(func => ({
        type: 'function',
        name: func.name,
        inputs: func.inputs,
        outputs: func.outputs,
        stateMutability: func.stateMutability
      }));

    } catch (error) {
      console.warn('Reverse engineering failed:', error);
    }
  }

  /**
   * Extract function selectors from bytecode
   */
  private extractFunctionSelectors(bytecode: string): string[] {
    const selectors: string[] = [];
    
    try {
      // Look for function dispatcher patterns in bytecode
      // This is a simplified implementation
      const hex = bytecode.slice(2); // Remove 0x prefix
      
      // Look for PUSH4 instructions followed by EQ/DUP patterns
      // Function selectors are typically 4 bytes (8 hex chars)
      const selectorPattern = /63([0-9a-f]{8})/gi;
      let match;
      
      while ((match = selectorPattern.exec(hex)) !== null) {
        const selector = '0x' + match[1];
        if (!selectors.includes(selector)) {
          selectors.push(selector);
        }
      }
      
      console.log(`📋 Found ${selectors.length} potential function selectors`);
      return selectors.slice(0, 20); // Limit to first 20 to avoid noise
      
    } catch (error) {
      console.warn('Failed to extract function selectors:', error);
      return [];
    }
  }

  /**
   * Analyze contract functions
   */
  private analyzeFunctions(contractInfo: ContractInfo): void {
    contractInfo.functions.forEach(func => {
      // Add gas estimates for common function types
      if (func.stateMutability === 'view' || func.stateMutability === 'pure') {
        func.gasEstimate = 3000; // Low gas for read operations
      } else if (func.stateMutability === 'payable') {
        func.gasEstimate = 50000; // Higher gas for payable functions
      } else {
        func.gasEstimate = 25000; // Medium gas for state changes
      }

      // Generate documentation hints based on function name
      if (func.name.includes('transfer')) {
        func.documentation = 'Token transfer function - handles asset movement';
      } else if (func.name.includes('approve')) {
        func.documentation = 'Approval function - grants spending permission';
      } else if (func.name.includes('balance')) {
        func.documentation = 'Balance query function - returns account balance';
      } else if (func.name.includes('owner')) {
        func.documentation = 'Ownership function - manages contract ownership';
      }
    });
  }

  /**
   * Analyze contract events
   */
  private analyzeEvents(contractInfo: ContractInfo): void {
    // Extract events from ABI if available
    if (contractInfo.abi) {
      contractInfo.events = contractInfo.abi
        .filter(item => item.type === 'event')
        .map(event => ({
          name: event.name,
          inputs: event.inputs.map((input: any) => ({
            name: input.name,
            type: input.type,
            indexed: input.indexed || false,
            internalType: input.internalType
          })),
          signature: this.generateEventSignature(event),
          topic: ethers.id(this.generateEventSignature(event)),
          anonymous: event.anonymous || false
        }));
    }
  }

  /**
   * Generate event signature
   */
  private generateEventSignature(event: any): string {
    const inputs = event.inputs.map((input: any) => input.type).join(',');
    return `${event.name}(${inputs})`;
  }

  /**
   * Get deployment information
   */
  private async getDeploymentInfo(contractInfo: ContractInfo): Promise<void> {
    try {
      const provider = this.networkClient.getProvider();
      if (!provider) return;

      // This would require more sophisticated block scanning
      // For now, we'll leave these as optional
      console.log(`📅 Deployment info lookup for ${contractInfo.address} (placeholder)`);
      
    } catch (error) {
      console.warn('Failed to get deployment info:', error);
    }
  }

  /**
   * Identify contract patterns
   */
  private identifyPatterns(contractInfo: ContractInfo): ContractPattern[] {
    const matches: ContractPattern[] = [];
    
    for (const pattern of this.knownPatterns) {
      const functionMatches = pattern.functions.filter(funcName =>
        contractInfo.functions.some(func => 
          func.name.toLowerCase().includes(funcName.toLowerCase())
        )
      );
      
      const eventMatches = pattern.events.filter(eventName =>
        contractInfo.events.some(event => 
          event.name.toLowerCase().includes(eventName.toLowerCase())
        )
      );
      
      const confidence = (functionMatches.length + eventMatches.length) / 
                        (pattern.functions.length + pattern.events.length);
      
      if (confidence > 0.3) {
        matches.push({
          ...pattern,
          confidence
        });
      }
    }
    
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate helpful suggestions based on contract analysis
   */
  private generateSuggestions(contractInfo: ContractInfo, patterns?: ContractPattern[]): string[] {
    const suggestions: string[] = [];
    
    if (!contractInfo.verified) {
      suggestions.push('Contract is not verified - consider verifying for better analysis');
    }
    
    if (contractInfo.functions.length === 0) {
      suggestions.push('No functions detected - contract might be a proxy or library');
    }
    
    if (contractInfo.functions.some(f => f.name.includes('transfer'))) {
      suggestions.push('Token contract detected - can interact with transfer functions');
    }
    
    if (contractInfo.functions.some(f => f.name.includes('owner'))) {
      suggestions.push('Ownable contract detected - check ownership functions');
    }
    
    if (patterns && patterns.length > 0) {
      suggestions.push(`Matches pattern: ${patterns[0].name} (${Math.round(patterns[0].confidence * 100)}% confidence)`);
    }
    
    suggestions.push('Use "generate tools" to create MCP tools for this contract');
    
    return suggestions;
  }

  /**
   * Initialize known contract patterns
   */
  private initializeKnownPatterns(): void {
    this.knownPatterns = [
      {
        name: 'ERC20 Token',
        description: 'Standard fungible token contract',
        functions: ['transfer', 'approve', 'balanceOf', 'totalSupply', 'allowance'],
        events: ['Transfer', 'Approval'],
        confidence: 0
      },
      {
        name: 'ERC721 NFT',
        description: 'Non-fungible token contract',
        functions: ['ownerOf', 'approve', 'transferFrom', 'tokenURI', 'balanceOf'],
        events: ['Transfer', 'Approval', 'ApprovalForAll'],
        confidence: 0
      },
      {
        name: 'Ownable Contract',
        description: 'Contract with ownership functionality',
        functions: ['owner', 'transferOwnership', 'renounceOwnership'],
        events: ['OwnershipTransferred'],
        confidence: 0
      },
      {
        name: 'Pausable Contract',
        description: 'Contract with pause/unpause functionality',
        functions: ['pause', 'unpause', 'paused'],
        events: ['Paused', 'Unpaused'],
        confidence: 0
      },
      {
        name: 'Upgradeable Proxy',
        description: 'Upgradeable contract proxy',
        functions: ['implementation', 'upgrade', 'admin'],
        events: ['Upgraded', 'AdminChanged'],
        confidence: 0
      }
    ];
  }

  /**
   * Get cached contract info
   */
  getCachedContract(address: string): ContractInfo | undefined {
    return this.contractCache.get(address.toLowerCase());
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.contractCache.clear();
  }

  /**
   * Get analysis statistics
   */
  getStats(): { totalAnalyzed: number; verifiedContracts: number; cachedContracts: number } {
    const totalAnalyzed = this.contractCache.size;
    const verifiedContracts = Array.from(this.contractCache.values())
      .filter(contract => contract.verified).length;
    
    return {
      totalAnalyzed,
      verifiedContracts,
      cachedContracts: this.contractCache.size
    };
  }
}

export default ContractAnalysisEngine;