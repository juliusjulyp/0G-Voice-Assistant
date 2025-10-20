import { ethers } from 'ethers';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';

export interface KnowledgeSource {
  url: string;
  type: 'documentation' | 'github' | 'tutorial' | 'api' | 'blockchain';
  priority: number;
  lastUpdated?: Date;
  content?: string;
  metadata?: any;
}

export interface ContractKnowledge {
  address: string;
  abi?: any[];
  bytecode?: string;
  sourceCode?: string;
  compiler?: string;
  constructorArgs?: any[];
  verified?: boolean;
  name?: string;
  functions: ContractFunction[];
  events: ContractEvent[];
  deploymentTx?: string;
  deployer?: string;
  blockNumber?: number;
}

export interface ContractFunction {
  name: string;
  inputs: any[];
  outputs: any[];
  stateMutability: string;
  signature: string;
  examples?: string[];
  documentation?: string;
}

export interface ContractEvent {
  name: string;
  inputs: any[];
  signature: string;
  examples?: string[];
}

export interface SmartContractPattern {
  name: string;
  description: string;
  template: string;
  dependencies: string[];
  gasEstimate: string;
  securityNotes: string[];
  examples: string[];
}

export class KnowledgeIngestionEngine {
  private knowledgeBase: Map<string, any> = new Map();
  private contractDatabase: Map<string, ContractKnowledge> = new Map();
  private deploymentPatterns: Map<string, SmartContractPattern> = new Map();
  private provider: ethers.JsonRpcProvider;

  // 0G-specific knowledge sources
  private readonly KNOWLEDGE_SOURCES: KnowledgeSource[] = [
    // Core 0G Documentation
    {
      url: 'https://docs.0g.ai',
      type: 'documentation',
      priority: 1
    },
    {
      url: 'https://0g.ai/blog',
      type: 'documentation',
      priority: 1
    },
    // GitHub Repositories
    {
      url: 'https://github.com/0glabs/0g-chain',
      type: 'github',
      priority: 1
    },
    {
      url: 'https://github.com/0glabs/0g-ts-sdk',
      type: 'github',
      priority: 1
    },
    {
      url: 'https://github.com/0glabs/0g-storage-node',
      type: 'github',
      priority: 2
    },
    {
      url: 'https://github.com/0glabs/0g-storage-client',
      type: 'github',
      priority: 2
    },
    // API Documentation
    {
      url: 'https://api.0g.ai/docs',
      type: 'api',
      priority: 2
    },
    // Blockchain Explorer
    {
      url: 'https://chainscan-galileo.0g.ai',
      type: 'blockchain',
      priority: 3
    }
  ];

  // 0G-specific learning content sources
  private readonly LEARNING_CONTENT = {
    tutorials: [
      'https://docs.0g.ai/getting-started',
      'https://docs.0g.ai/storage/quickstart', 
      'https://docs.0g.ai/compute/overview',
      'https://docs.0g.ai/sdk/typescript'
    ],
    examples: [
      'https://github.com/0glabs/0g-ts-sdk/tree/main/examples',
      'https://github.com/0glabs/0g-chain/tree/main/tests'
    ],
    releases: [
      'https://api.github.com/repos/0glabs/0g-chain/releases',
      'https://api.github.com/repos/0glabs/0g-ts-sdk/releases'
    ]
  };

  constructor(rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.initializeDeploymentPatterns();
  }

  /**
   * Ingest knowledge from all configured sources
   */
  async ingestAllKnowledge(): Promise<void> {
    console.log('🧠 Starting knowledge ingestion process...');
    
    // Parallel ingestion for faster processing
    const ingestionPromises = this.KNOWLEDGE_SOURCES.map(async (source) => {
      try {
        console.log(`📚 Ingesting from: ${source.url}`);
        await this.ingestFromSource(source);
        console.log(`✅ Completed: ${source.url}`);
      } catch (error) {
        console.error(`❌ Failed to ingest from ${source.url}:`, error);
      }
    });

    await Promise.allSettled(ingestionPromises);
    
    // Scan blockchain for recent smart contracts
    await this.scanRecentContracts();
    
    console.log('🎯 Knowledge ingestion completed!');
    this.summarizeKnowledge();
  }

  /**
   * Ingest knowledge from a specific source
   */
  private async ingestFromSource(source: KnowledgeSource): Promise<void> {
    switch (source.type) {
      case 'documentation':
        await this.ingestDocumentation(source);
        break;
      case 'github':
        await this.ingestGitHubRepo(source);
        break;
      case 'blockchain':
        await this.ingestBlockchainData(source);
        break;
    }
  }

  /**
   * Ingest 0G documentation
   */
  private async ingestDocumentation(source: KnowledgeSource): Promise<void> {
    try {
      // Key documentation sections to crawl
      const docSections = [
        '/smart-contracts',
        '/sdk',
        '/api-reference',
        '/tutorials',
        '/examples',
        '/deployment'
      ];

      for (const section of docSections) {
        try {
          const url = `${source.url}${section}`;
          const content = await this.fetchWebContent(url);
          
          if (content) {
            this.knowledgeBase.set(`docs_${section.replace('/', '')}`, {
              content,
              url,
              type: 'documentation',
              timestamp: new Date(),
              section
            });

            // Extract smart contract patterns and examples
            await this.extractContractPatterns(content, section);
          }
        } catch (error) {
          console.log(`📝 Section ${section} not found or inaccessible`);
        }
      }
    } catch (error) {
      console.error('Documentation ingestion failed:', error);
    }
  }

  /**
   * Ingest GitHub repositories for code examples and patterns
   */
  private async ingestGitHubRepo(source: KnowledgeSource): Promise<void> {
    try {
      // Extract repo information
      const repoMatch = source.url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!repoMatch) return;

      const [, owner, repo] = repoMatch;
      
      // Fetch repository structure and key files
      const keyFiles = [
        'README.md',
        'docs/',
        'examples/',
        'contracts/',
        'src/',
        'package.json'
      ];

      for (const file of keyFiles) {
        try {
          const fileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${file}`;
          const content = await this.fetchWebContent(fileUrl);
          
          if (content) {
            this.knowledgeBase.set(`github_${repo}_${file.replace(/[\/\.]/g, '_')}`, {
              content,
              url: fileUrl,
              type: 'github',
              repo: `${owner}/${repo}`,
              file,
              timestamp: new Date()
            });

            // Extract deployment scripts and contract examples
            if (file.includes('contract') || file.includes('deploy') || file.endsWith('.sol')) {
              await this.extractDeploymentPatterns(content, file);
            }
          }
        } catch (error) {
          console.log(`📂 File ${file} not found in ${repo}`);
        }
      }
    } catch (error) {
      console.error('GitHub ingestion failed:', error);
    }
  }

  /**
   * Scan blockchain for smart contracts and deployment patterns
   */
  private async ingestBlockchainData(source: KnowledgeSource): Promise<void> {
    try {
      console.log('🔍 Scanning blockchain for recent contracts...');
      await this.scanRecentContracts();
    } catch (error) {
      console.error('Blockchain scanning failed:', error);
    }
  }

  /**
   * Scan recent blocks for contract deployments
   */
  async scanRecentContracts(blockCount: number = 1000): Promise<ContractKnowledge[]> {
    const discoveredContracts: ContractKnowledge[] = [];
    
    try {
      const latestBlock = await this.provider.getBlockNumber();
      const startBlock = Math.max(0, latestBlock - blockCount);
      
      console.log(`🔍 Scanning blocks ${startBlock} to ${latestBlock} for contracts...`);

      // Scan blocks in batches for performance
      const batchSize = 100;
      for (let i = startBlock; i <= latestBlock; i += batchSize) {
        const endBlock = Math.min(i + batchSize - 1, latestBlock);
        const contracts = await this.scanBlockRange(i, endBlock);
        discoveredContracts.push(...contracts);
      }

      console.log(`📊 Discovered ${discoveredContracts.length} contracts`);
      return discoveredContracts;
    } catch (error) {
      console.error('Contract scanning failed:', error);
      return [];
    }
  }

  /**
   * Scan a range of blocks for contract deployments
   */
  private async scanBlockRange(startBlock: number, endBlock: number): Promise<ContractKnowledge[]> {
    const contracts: ContractKnowledge[] = [];

    try {
      // Get all transactions in the block range
      for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
        try {
          const block = await this.provider.getBlock(blockNum, true);
          if (!block || !block.transactions) continue;

          for (const tx of block.transactions) {
            if (typeof tx === 'string') continue;
            
            // Check if this is a contract deployment (to address is null)
            if ((tx as any).to === null && (tx as any).data && (tx as any).data.length > 2) {
              const contractKnowledge = await this.analyzeContractDeployment(tx, blockNum);
              if (contractKnowledge) {
                contracts.push(contractKnowledge);
                this.contractDatabase.set(contractKnowledge.address, contractKnowledge);
              }
            }
          }
        } catch (blockError) {
          console.log(`⏭️  Skipping block ${blockNum}: ${blockError instanceof Error ? blockError.message : String(blockError)}`);
        }
      }
    } catch (error) {
      console.error(`Block range scan failed: ${error}`);
    }

    return contracts;
  }

  /**
   * Analyze a contract deployment transaction
   */
  private async analyzeContractDeployment(tx: any, blockNumber: number): Promise<ContractKnowledge | null> {
    try {
      // Get transaction receipt to find contract address
      const receipt = await this.provider.getTransactionReceipt(tx.hash);
      if (!receipt || !receipt.contractAddress) return null;

      const contractAddress = receipt.contractAddress;
      
      // Try to get contract bytecode
      const bytecode = await this.provider.getCode(contractAddress);
      if (bytecode === '0x') return null; // Not a contract

      // Analyze the contract
      const contractKnowledge: ContractKnowledge = {
        address: contractAddress,
        bytecode,
        deploymentTx: tx.hash,
        deployer: tx.from,
        blockNumber,
        functions: [],
        events: [],
        verified: false
      };

      // Try to extract ABI and function signatures from bytecode
      const extractedFunctions = this.extractFunctionSignatures(bytecode);
      contractKnowledge.functions = extractedFunctions;

      // Attempt to identify contract type based on function signatures
      contractKnowledge.name = this.identifyContractType(extractedFunctions);

      console.log(`📋 Analyzed contract: ${contractAddress} (${contractKnowledge.name})`);
      
      return contractKnowledge;
    } catch (error) {
      console.error(`Contract analysis failed for ${tx.hash}:`, error);
      return null;
    }
  }

  /**
   * Extract function signatures from bytecode
   */
  private extractFunctionSignatures(bytecode: string): ContractFunction[] {
    const functions: ContractFunction[] = [];
    
    try {
      // Extract function selectors (first 4 bytes of keccak256 hash)
      // This is a simplified implementation - in production, use a proper bytecode analyzer
      const selectorRegex = /63([a-fA-F0-9]{8})/g;
      const matches = bytecode.match(selectorRegex);
      
      if (matches) {
        const knownSelectors = this.getKnownFunctionSelectors();
        
        for (const match of matches) {
          const selector = match.substring(2); // Remove '63' prefix
          const knownFunction = knownSelectors.get(selector);
          
          if (knownFunction) {
            functions.push({
              name: knownFunction.name,
              inputs: knownFunction.inputs || [],
              outputs: knownFunction.outputs || [],
              stateMutability: knownFunction.stateMutability || 'nonpayable',
              signature: knownFunction.signature
            });
          }
        }
      }
    } catch (error) {
      console.error('Function signature extraction failed:', error);
    }
    
    return functions;
  }

  /**
   * Get known function selectors for common patterns
   */
  private getKnownFunctionSelectors(): Map<string, any> {
    const selectors = new Map();
    
    // Common ERC20 functions
    selectors.set('70a08231', { name: 'balanceOf', signature: 'balanceOf(address)', stateMutability: 'view' });
    selectors.set('a9059cbb', { name: 'transfer', signature: 'transfer(address,uint256)', stateMutability: 'nonpayable' });
    selectors.set('095ea7b3', { name: 'approve', signature: 'approve(address,uint256)', stateMutability: 'nonpayable' });
    
    // Common ERC721 functions
    selectors.set('6352211e', { name: 'ownerOf', signature: 'ownerOf(uint256)', stateMutability: 'view' });
    selectors.set('42842e0e', { name: 'safeTransferFrom', signature: 'safeTransferFrom(address,address,uint256)', stateMutability: 'nonpayable' });
    
    // Common contract patterns
    selectors.set('8da5cb5b', { name: 'owner', signature: 'owner()', stateMutability: 'view' });
    selectors.set('f2fde38b', { name: 'transferOwnership', signature: 'transferOwnership(address)', stateMutability: 'nonpayable' });
    
    return selectors;
  }

  /**
   * Identify contract type based on function signatures
   */
  private identifyContractType(functions: ContractFunction[]): string {
    const functionNames = functions.map(f => f.name);
    
    if (functionNames.includes('balanceOf') && functionNames.includes('transfer')) {
      return 'ERC20Token';
    }
    if (functionNames.includes('ownerOf') && functionNames.includes('safeTransferFrom')) {
      return 'ERC721NFT';
    }
    if (functionNames.includes('owner') && functionNames.includes('transferOwnership')) {
      return 'OwnableContract';
    }
    
    return 'GenericContract';
  }

  /**
   * Extract smart contract patterns from documentation
   */
  private async extractContractPatterns(content: string, section: string): Promise<void> {
    // Look for code blocks and deployment examples
    const codeBlockRegex = /```solidity([\s\S]*?)```/g;
    const deploymentRegex = /deploy|deployment|contract/i;
    
    if (deploymentRegex.test(content)) {
      let match;
      while ((match = codeBlockRegex.exec(content)) !== null) {
        const code = match[1].trim();
        if (code.includes('contract ') || code.includes('deploy')) {
          // Extract pattern information
          const pattern = this.parseContractPattern(code, section);
          if (pattern) {
            this.deploymentPatterns.set(pattern.name, pattern);
          }
        }
      }
    }
  }

  /**
   * Extract deployment patterns from GitHub files
   */
  private async extractDeploymentPatterns(content: string, fileName: string): Promise<void> {
    if (fileName.endsWith('.sol') || fileName.includes('deploy') || fileName.includes('script')) {
      const pattern = this.parseContractPattern(content, fileName);
      if (pattern) {
        this.deploymentPatterns.set(pattern.name, pattern);
      }
    }
  }

  /**
   * Parse contract pattern from code
   */
  private parseContractPattern(code: string, source: string): SmartContractPattern | null {
    try {
      // Extract contract name
      const contractMatch = code.match(/contract\s+(\w+)/);
      const contractName = contractMatch ? contractMatch[1] : `Pattern_${Date.now()}`;
      
      // Extract dependencies (imports)
      const importMatches = code.match(/import\s+["']([^"']+)["']/g) || [];
      const dependencies = importMatches.map(imp => imp.replace(/import\s+["']([^"']+)["']/, '$1'));
      
      return {
        name: contractName,
        description: `Contract pattern extracted from ${source}`,
        template: code,
        dependencies,
        gasEstimate: 'To be calculated',
        securityNotes: ['Review before deployment', 'Audit recommended'],
        examples: [code]
      };
    } catch (error) {
      console.error('Pattern parsing failed:', error);
      return null;
    }
  }

  /**
   * Initialize common deployment patterns
   */
  private initializeDeploymentPatterns(): void {
    // Add common 0G-specific patterns
    this.deploymentPatterns.set('BasicERC20', {
      name: 'BasicERC20',
      description: 'Basic ERC20 token optimized for 0G network',
      template: `
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BasicToken is ERC20 {
    constructor(string memory name, string memory symbol, uint256 totalSupply) 
        ERC20(name, symbol) {
        _mint(msg.sender, totalSupply);
    }
}`,
      dependencies: ['@openzeppelin/contracts'],
      gasEstimate: '~800,000 gas',
      securityNotes: ['Basic implementation', 'Consider access controls'],
      examples: []
    });
  }

  /**
   * Real-time 0G documentation monitoring
   */
  async checkForUpdates(): Promise<{ hasUpdates: boolean; updates: string[] }> {
    console.log('🔄 Checking for 0G documentation updates...');
    const updates: string[] = [];
    
    try {
      // Check GitHub releases for new versions
      for (const releaseUrl of this.LEARNING_CONTENT.releases) {
        const releases = await this.fetchGitHubReleases(releaseUrl);
        if (releases && releases.length > 0) {
          const latestRelease = releases[0];
          updates.push(`New release: ${latestRelease.name} - ${latestRelease.tag_name}`);
        }
      }
      
      // Check 0G blog for new posts (simplified check)
      const blogContent = await this.fetchWebContent('https://0g.ai/blog');
      if (blogContent) {
        updates.push('Blog content updated');
      }
      
      console.log(`📊 Found ${updates.length} potential updates`);
      return { hasUpdates: updates.length > 0, updates };
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
      return { hasUpdates: false, updates: [] };
    }
  }

  /**
   * Get latest 0G developments and changes
   */
  async getLatest0GUpdates(): Promise<{ 
    releases: any[]; 
    documentation: string[];
    tutorials: string[];
  }> {
    console.log('📈 Fetching latest 0G updates...');
    
    const results = {
      releases: [] as any[],
      documentation: [] as string[],
      tutorials: [] as string[]
    };

    try {
      // Fetch latest GitHub releases
      for (const releaseUrl of this.LEARNING_CONTENT.releases) {
        const releases = await this.fetchGitHubReleases(releaseUrl);
        if (releases) {
          results.releases.push(...releases.slice(0, 3)); // Get latest 3 releases
        }
      }

      // Fetch tutorial content
      for (const tutorialUrl of this.LEARNING_CONTENT.tutorials) {
        const content = await this.fetchWebContent(tutorialUrl);
        if (content) {
          results.tutorials.push(`Tutorial: ${tutorialUrl}`);
        }
      }

      console.log(`✅ Retrieved ${results.releases.length} releases and ${results.tutorials.length} tutorials`);
      return results;
    } catch (error) {
      console.error('❌ Error fetching latest updates:', error);
      return results;
    }
  }

  /**
   * Search 0G documentation for specific topics
   */
  async search0GDocumentation(query: string): Promise<string[]> {
    console.log(`🔍 Searching 0G docs for: "${query}"`);
    const results: string[] = [];
    
    try {
      // Search main documentation
      const docsContent = await this.fetchWebContent('https://docs.0g.ai');
      if (docsContent && docsContent.toLowerCase().includes(query.toLowerCase())) {
        results.push('Found in main documentation');
      }
      
      // Search GitHub repositories
      for (const source of this.KNOWLEDGE_SOURCES.filter(s => s.type === 'github')) {
        const content = await this.fetchWebContent(`${source.url}/search?q=${encodeURIComponent(query)}`);
        if (content) {
          results.push(`Found in ${source.url}`);
        }
      }
      
      console.log(`📋 Search results: ${results.length} matches found`);
      return results;
    } catch (error) {
      console.error('❌ Error searching documentation:', error);
      return results;
    }
  }

  /**
   * Get 0G learning path for developers
   */
  async generateLearningPath(skillLevel: 'beginner' | 'intermediate' | 'advanced'): Promise<{
    path: string[];
    estimatedTime: string;
    prerequisites: string[];
  }> {
    console.log(`🎓 Generating learning path for ${skillLevel} level`);
    
    const paths = {
      beginner: {
        path: [
          '1. Understand 0G blockchain basics',
          '2. Set up development environment', 
          '3. Connect to 0G Galileo Testnet',
          '4. Deploy your first smart contract',
          '5. Use 0G Storage for file operations',
          '6. Explore 0G AI Compute features'
        ],
        estimatedTime: '2-3 weeks',
        prerequisites: ['Basic blockchain knowledge', 'JavaScript/TypeScript familiarity']
      },
      intermediate: {
        path: [
          '1. Advanced smart contract patterns',
          '2. 0G Storage optimization techniques',
          '3. AI model deployment on 0G Compute',
          '4. Cross-chain integrations',
          '5. Performance optimization',
          '6. Security best practices'
        ],
        estimatedTime: '3-4 weeks', 
        prerequisites: ['Completed beginner path', 'Solidity experience', 'AI/ML basics']
      },
      advanced: {
        path: [
          '1. 0G network architecture deep dive',
          '2. Custom precompile development',
          '3. Advanced AI compute workflows',
          '4. Network performance tuning',
          '5. Contributing to 0G core',
          '6. Enterprise deployment strategies'
        ],
        estimatedTime: '4-6 weeks',
        prerequisites: ['Completed intermediate path', 'Systems programming', 'DevOps experience']
      }
    };
    
    return paths[skillLevel];
  }

  /**
   * Fetch GitHub releases information
   */
  private async fetchGitHubReleases(apiUrl: string): Promise<any[] | null> {
    try {
      const content = await this.fetchWebContent(apiUrl);
      if (content) {
        return JSON.parse(content);
      }
      return null;
    } catch (error) {
      console.error(`❌ Failed to fetch GitHub releases from ${apiUrl}:`, error);
      return null;
    }
  }

  /**
   * Fetch web content (abstracted for different methods)
   */
  private async fetchWebContent(url: string): Promise<string | null> {
    try {
      console.log(`📥 Fetching: ${url}`);
      
      const content = await this.httpFetch(url);
      if (content) {
        console.log(`✅ Successfully fetched ${content.length} characters from: ${url}`);
        return content;
      }
      return null;
    } catch (error) {
      console.error(`❌ Failed to fetch ${url}:`, error);
      return null;
    }
  }

  /**
   * HTTP fetch implementation using Node.js built-in modules
   */
  private async httpFetch(url: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;
      
      const request = client.get(url, {
        headers: {
          'User-Agent': '0G-Voice-Assistant/1.0 (Learning Bot)',
          'Accept': 'text/html,application/json,text/plain,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        timeout: 10000
      }, (response) => {
        // Handle redirects
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          console.log(`🔄 Redirecting to: ${response.headers.location}`);
          resolve(this.httpFetch(response.headers.location));
          return;
        }

        // Check for successful response
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        let data = '';
        response.setEncoding('utf8');
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          resolve(data);
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * Get contract information by address
   */
  getContractKnowledge(address: string): ContractKnowledge | undefined {
    return this.contractDatabase.get(address.toLowerCase());
  }

  /**
   * Get deployment pattern by name
   */
  getDeploymentPattern(name: string): SmartContractPattern | undefined {
    return this.deploymentPatterns.get(name);
  }

  /**
   * Get all deployment patterns
   */
  getAllDeploymentPatterns(): SmartContractPattern[] {
    return Array.from(this.deploymentPatterns.values());
  }

  /**
   * Search knowledge base
   */
  searchKnowledge(query: string): any[] {
    const results: any[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const [key, value] of this.knowledgeBase) {
      if (key.toLowerCase().includes(lowerQuery) || 
          (value.content && value.content.toLowerCase().includes(lowerQuery))) {
        results.push({ key, ...value });
      }
    }
    
    return results;
  }

  /**
   * Summarize ingested knowledge
   */
  private summarizeKnowledge(): void {
    console.log('\n📊 Knowledge Base Summary:');
    console.log(`  💾 Total entries: ${this.knowledgeBase.size}`);
    console.log(`  📋 Contracts analyzed: ${this.contractDatabase.size}`);
    console.log(`  🏗️  Deployment patterns: ${this.deploymentPatterns.size}`);
    
    // Group by type
    const typeCount = new Map();
    for (const [, value] of this.knowledgeBase) {
      const type = value.type || 'unknown';
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    }
    
    console.log('  📚 Content by type:');
    for (const [type, count] of typeCount) {
      console.log(`    ${type}: ${count}`);
    }
  }

  /**
   * Save knowledge base to file for persistence
   */
  async saveKnowledgeBase(filePath: string): Promise<void> {
    try {
      const data = {
        knowledgeBase: Object.fromEntries(this.knowledgeBase),
        contractDatabase: Object.fromEntries(this.contractDatabase),
        deploymentPatterns: Object.fromEntries(this.deploymentPatterns),
        lastUpdated: new Date().toISOString()
      };
      
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      console.log(`💾 Knowledge base saved to: ${filePath}`);
    } catch (error) {
      console.error('Failed to save knowledge base:', error);
    }
  }

  /**
   * Load knowledge base from file
   */
  async loadKnowledgeBase(filePath: string): Promise<void> {
    try {
      const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      
      this.knowledgeBase = new Map(Object.entries(data.knowledgeBase || {}));
      this.contractDatabase = new Map(Object.entries(data.contractDatabase || {}));
      this.deploymentPatterns = new Map(Object.entries(data.deploymentPatterns || {}));
      
      console.log(`📚 Knowledge base loaded from: ${filePath}`);
      this.summarizeKnowledge();
    } catch (error) {
      console.error('Failed to load knowledge base:', error);
    }
  }
}

export default KnowledgeIngestionEngine;