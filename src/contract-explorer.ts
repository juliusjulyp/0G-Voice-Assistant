import { ethers } from 'ethers';
import ContractAnalysisEngine, { ContractInfo, AnalysisResult } from './contract-analysis-engine.js';
import DynamicToolGenerator, { GeneratedTool, GenerationResult } from './dynamic-tool-generator.js';
import { OGNetworkClient } from './network-client.js';

export interface ExplorationRequest {
  address?: string;
  bytecodeHash?: string;
  functionSignature?: string;
  deploymentBlock?: number;
  includeTools?: boolean;
}

export interface ExplorationResult {
  success: boolean;
  contracts: ContractExplorationData[];
  totalFound: number;
  searchCriteria: ExplorationRequest;
  suggestions: string[];
  error?: string;
}

export interface ContractExplorationData {
  contractInfo: ContractInfo;
  analysisResult: AnalysisResult;
  generatedTools?: GeneratedTool[];
  interactions: ContractInteraction[];
  relatedContracts: string[];
  riskAssessment: RiskAssessment;
}

export interface ContractInteraction {
  type: 'function_call' | 'event_emission' | 'value_transfer';
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
  details: any;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  score: number;
  recommendations: string[];
}

export interface RiskFactor {
  type: 'unverified' | 'proxy' | 'upgradeability' | 'ownership' | 'pause' | 'mint' | 'burn' | 'fee';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detected: boolean;
}

export interface ContractSearchOptions {
  limit: number;
  includeUnverified: boolean;
  minConfidence: number;
  categories: string[];
  sortBy: 'confidence' | 'deployment' | 'activity';
  sortOrder: 'asc' | 'desc';
}

export class ContractExplorer {
  private analysisEngine: ContractAnalysisEngine;
  private toolGenerator: DynamicToolGenerator;
  private networkClient: OGNetworkClient;
  private explorationHistory: Map<string, ContractExplorationData> = new Map();
  
  constructor(networkClient: OGNetworkClient) {
    this.networkClient = networkClient;
    this.analysisEngine = new ContractAnalysisEngine(networkClient);
    this.toolGenerator = new DynamicToolGenerator(networkClient);
  }

  /**
   * Explore contracts based on search criteria
   */
  async exploreContracts(request: ExplorationRequest): Promise<ExplorationResult> {
    try {
      console.log('🔍 Starting contract exploration...');
      
      const contracts: ContractExplorationData[] = [];
      const suggestions: string[] = [];

      // Direct address exploration
      if (request.address) {
        const explorationData = await this.exploreContract(request.address, request.includeTools);
        if (explorationData) {
          contracts.push(explorationData);
        }
      }

      // Function signature search
      if (request.functionSignature) {
        const foundContracts = await this.searchByFunctionSignature(request.functionSignature);
        for (const address of foundContracts) {
          const explorationData = await this.exploreContract(address, request.includeTools);
          if (explorationData) {
            contracts.push(explorationData);
          }
        }
      }

      // Generate suggestions based on results
      if (contracts.length === 0) {
        suggestions.push('No contracts found matching criteria');
        suggestions.push('Try searching with a different address or function signature');
        suggestions.push('Check if the contract is deployed on the correct network');
      } else {
        suggestions.push(`Found ${contracts.length} contract(s)`);
        if (request.includeTools) {
          const totalTools = contracts.reduce((sum, c) => sum + (c.generatedTools?.length || 0), 0);
          suggestions.push(`Generated ${totalTools} interactive tools`);
        }
        suggestions.push('Use the analysis results to understand contract functionality');
      }

      return {
        success: true,
        contracts,
        totalFound: contracts.length,
        searchCriteria: request,
        suggestions
      };

    } catch (error) {
      console.error('Contract exploration error:', error);
      return {
        success: false,
        contracts: [],
        totalFound: 0,
        searchCriteria: request,
        suggestions: ['Exploration failed', 'Check network connection and try again'],
        error: error instanceof Error ? error.message : 'Unknown exploration error'
      };
    }
  }

  /**
   * Explore a specific contract
   */
  private async exploreContract(address: string, includeTools: boolean = false): Promise<ContractExplorationData | null> {
    try {
      // Check cache first
      if (this.explorationHistory.has(address)) {
        const cached = this.explorationHistory.get(address)!;
        if (!includeTools || cached.generatedTools) {
          return cached;
        }
      }

      console.log(`🔍 Exploring contract: ${address}`);

      // Analyze the contract
      const analysisResult = await this.analysisEngine.analyzeContract(address);
      
      if (!analysisResult.success || !analysisResult.contractInfo) {
        console.warn(`Failed to analyze contract ${address}:`, analysisResult.error);
        return null;
      }

      const contractInfo = analysisResult.contractInfo;

      // Generate tools if requested
      let generatedTools: GeneratedTool[] | undefined;
      if (includeTools && contractInfo.functions.length > 0) {
        const toolResult = await this.toolGenerator.generateToolsForContract(contractInfo);
        if (toolResult.success) {
          generatedTools = toolResult.tools;
        }
      }

      // Get interaction history
      const interactions = await this.getContractInteractions(address);

      // Find related contracts
      const relatedContracts = await this.findRelatedContracts(contractInfo);

      // Perform risk assessment
      const riskAssessment = this.assessContractRisk(contractInfo);

      const explorationData: ContractExplorationData = {
        contractInfo,
        analysisResult,
        generatedTools,
        interactions,
        relatedContracts,
        riskAssessment
      };

      // Cache the result
      this.explorationHistory.set(address, explorationData);

      return explorationData;

    } catch (error) {
      console.error(`Error exploring contract ${address}:`, error);
      return null;
    }
  }

  /**
   * Search contracts by function signature
   */
  private async searchByFunctionSignature(signature: string): Promise<string[]> {
    try {
      console.log(`🔍 Searching contracts with function: ${signature}`);
      
      // This would require a more sophisticated indexing system
      // For now, return contracts from cache that match
      const matchingContracts: string[] = [];
      
      for (const [address, data] of this.explorationHistory.entries()) {
        const hasFunction = data.contractInfo.functions.some(func => 
          func.signature.includes(signature) || func.name.includes(signature)
        );
        
        if (hasFunction) {
          matchingContracts.push(address);
        }
      }
      
      return matchingContracts;

    } catch (error) {
      console.error('Function signature search error:', error);
      return [];
    }
  }

  /**
   * Get contract interaction history
   */
  private async getContractInteractions(address: string): Promise<ContractInteraction[]> {
    try {
      // This would require event indexing or block scanning
      // For now, return placeholder data
      console.log(`📜 Getting interaction history for ${address}`);
      
      return [
        // Placeholder interactions would be fetched from indexed data
      ];

    } catch (error) {
      console.warn('Failed to get contract interactions:', error);
      return [];
    }
  }

  /**
   * Find related contracts (factories, proxies, etc.)
   */
  private async findRelatedContracts(contractInfo: ContractInfo): Promise<string[]> {
    try {
      const related: string[] = [];
      
      // Look for factory patterns
      if (contractInfo.functions.some(f => f.name.toLowerCase().includes('create'))) {
        // This contract might be a factory
        console.log(`🏭 Potential factory contract detected: ${contractInfo.address}`);
      }
      
      // Look for proxy patterns
      if (contractInfo.functions.some(f => f.name.toLowerCase().includes('implementation'))) {
        // This might be a proxy
        console.log(`🔄 Potential proxy contract detected: ${contractInfo.address}`);
      }
      
      return related;

    } catch (error) {
      console.warn('Failed to find related contracts:', error);
      return [];
    }
  }

  /**
   * Assess contract risk level
   */
  private assessContractRisk(contractInfo: ContractInfo): RiskAssessment {
    const factors: RiskFactor[] = [];
    let riskScore = 0;

    // Unverified contract risk
    if (!contractInfo.verified) {
      factors.push({
        type: 'unverified',
        severity: 'medium',
        description: 'Contract source code is not verified',
        detected: true
      });
      riskScore += 30;
    }

    // Proxy/upgradeability risk
    const hasUpgradeability = contractInfo.functions.some(f => 
      f.name.toLowerCase().includes('upgrade') || 
      f.name.toLowerCase().includes('implementation')
    );
    if (hasUpgradeability) {
      factors.push({
        type: 'upgradeability',
        severity: 'high',
        description: 'Contract appears to have upgrade functionality',
        detected: true
      });
      riskScore += 40;
    }

    // Ownership concentration risk
    const hasOwnership = contractInfo.functions.some(f => 
      f.name.toLowerCase().includes('owner') ||
      f.name.toLowerCase().includes('admin')
    );
    if (hasOwnership) {
      factors.push({
        type: 'ownership',
        severity: 'medium',
        description: 'Contract has privileged ownership functions',
        detected: true
      });
      riskScore += 25;
    }

    // Pause functionality risk
    const hasPause = contractInfo.functions.some(f => 
      f.name.toLowerCase().includes('pause')
    );
    if (hasPause) {
      factors.push({
        type: 'pause',
        severity: 'medium',
        description: 'Contract can be paused by privileged accounts',
        detected: true
      });
      riskScore += 20;
    }

    // Mint/burn functionality
    const hasMint = contractInfo.functions.some(f => 
      f.name.toLowerCase().includes('mint')
    );
    const hasBurn = contractInfo.functions.some(f => 
      f.name.toLowerCase().includes('burn')
    );
    if (hasMint || hasBurn) {
      factors.push({
        type: 'mint',
        severity: 'medium',
        description: 'Contract has token minting or burning capabilities',
        detected: true
      });
      riskScore += 15;
    }

    // Determine risk level
    let level: RiskAssessment['level'];
    if (riskScore >= 80) level = 'critical';
    else if (riskScore >= 60) level = 'high';
    else if (riskScore >= 30) level = 'medium';
    else level = 'low';

    // Generate recommendations
    const recommendations: string[] = [];
    if (!contractInfo.verified) {
      recommendations.push('Verify contract source code for transparency');
    }
    if (hasUpgradeability) {
      recommendations.push('Review upgrade mechanisms and admin controls');
    }
    if (hasOwnership) {
      recommendations.push('Check ownership distribution and admin functions');
    }
    if (factors.length === 0) {
      recommendations.push('Contract appears to have standard functionality');
    }

    return {
      level,
      factors,
      score: riskScore,
      recommendations
    };
  }

  /**
   * Get exploration statistics
   */
  getExplorationStats(): {
    totalExplored: number;
    verifiedContracts: number;
    riskDistribution: Record<string, number>;
    toolsGenerated: number;
  } {
    const totalExplored = this.explorationHistory.size;
    let verifiedContracts = 0;
    let toolsGenerated = 0;
    const riskDistribution: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    for (const data of this.explorationHistory.values()) {
      if (data.contractInfo.verified) verifiedContracts++;
      if (data.generatedTools) toolsGenerated += data.generatedTools.length;
      riskDistribution[data.riskAssessment.level]++;
    }

    return {
      totalExplored,
      verifiedContracts,
      riskDistribution,
      toolsGenerated
    };
  }

  /**
   * Get cached exploration data
   */
  getCachedExploration(address: string): ContractExplorationData | undefined {
    return this.explorationHistory.get(address.toLowerCase());
  }

  /**
   * Clear exploration cache
   */
  clearCache(): void {
    this.explorationHistory.clear();
    this.analysisEngine.clearCache();
    this.toolGenerator.clearAllTools();
  }

  /**
   * Export exploration results
   */
  exportExplorationData(addresses?: string[]): any {
    const dataToExport = addresses ? 
      addresses.map(addr => this.explorationHistory.get(addr.toLowerCase())).filter(Boolean) :
      Array.from(this.explorationHistory.values());

    return {
      timestamp: new Date().toISOString(),
      exploredContracts: dataToExport.map(data => ({
        address: data!.contractInfo.address,
        verified: data!.contractInfo.verified,
        functionsCount: data!.contractInfo.functions.length,
        riskLevel: data!.riskAssessment.level,
        riskScore: data!.riskAssessment.score,
        toolsGenerated: data!.generatedTools?.length || 0
      })),
      statistics: this.getExplorationStats()
    };
  }

  /**
   * Quick contract lookup with basic info
   */
  async quickLookup(address: string): Promise<{
    exists: boolean;
    verified: boolean;
    functionsCount: number;
    riskLevel?: string;
    suggestions: string[];
  }> {
    try {
      const cached = this.getCachedExploration(address);
      if (cached) {
        return {
          exists: true,
          verified: cached.contractInfo.verified,
          functionsCount: cached.contractInfo.functions.length,
          riskLevel: cached.riskAssessment.level,
          suggestions: [
            'Contract already analyzed',
            'Use full exploration for detailed analysis',
            'Generate tools for interaction'
          ]
        };
      }

      const provider = this.networkClient.getProvider();
      if (!provider) {
        throw new Error('Network provider not available');
      }

      const code = await provider.getCode(address);
      const exists = code !== '0x';

      return {
        exists,
        verified: false, // Unknown until analyzed
        functionsCount: 0, // Unknown until analyzed
        suggestions: exists ? [
          'Contract exists but not analyzed yet',
          'Use explore command for full analysis',
          'Check contract verification status'
        ] : [
          'No contract found at this address',
          'Verify the address is correct',
          'Check if deployed on the right network'
        ]
      };

    } catch (error) {
      return {
        exists: false,
        verified: false,
        functionsCount: 0,
        suggestions: [
          'Lookup failed - check network connection',
          'Verify address format is correct'
        ]
      };
    }
  }
}

export default ContractExplorer;