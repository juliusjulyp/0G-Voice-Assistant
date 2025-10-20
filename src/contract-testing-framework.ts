import { ethers } from 'ethers';
import { OGNetworkClient } from './network-client.js';
import ContractExplorer, { ContractExplorationData } from './contract-explorer.js';
import { ContractInfo, ContractFunction } from './contract-analysis-engine.js';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  type: 'function_call' | 'state_verification' | 'event_emission' | 'gas_estimation' | 'security_check';
  contractAddress: string;
  functionName?: string;
  inputs?: any[];
  expectedOutputs?: any[];
  expectedEvents?: string[];
  gasLimit?: number;
  shouldFail?: boolean;
  timeout?: number;
  setup?: TestSetupStep[];
  cleanup?: TestCleanupStep[];
}

export interface TestSetupStep {
  action: 'deploy' | 'fund' | 'approve' | 'call';
  description: string;
  parameters?: any;
}

export interface TestCleanupStep {
  action: 'transfer' | 'revoke' | 'cleanup';
  description: string;
  parameters?: any;
}

export interface TestResult {
  testId: string;
  testName: string;
  success: boolean;
  executionTime: number;
  gasUsed: string;
  actualOutputs?: any[];
  actualEvents?: string[];
  error?: string;
  warnings: string[];
  details: any;
}

export interface TestSuiteResult {
  suiteId: string;
  suiteName: string;
  contractAddress: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalExecutionTime: number;
  totalGasUsed: string;
  testResults: TestResult[];
  coverage: TestCoverage;
  recommendations: string[];
}

export interface TestCoverage {
  functionsTotal: number;
  functionsTested: number;
  functionsUntested: string[];
  stateVariablesCovered: number;
  eventsCovered: number;
  coveragePercentage: number;
}

export interface SecurityTest {
  name: string;
  description: string;
  category: 'reentrancy' | 'overflow' | 'underflow' | 'access_control' | 'timestamp' | 'randomness';
  severity: 'low' | 'medium' | 'high' | 'critical';
  checkFunction: (contractInfo: ContractInfo) => Promise<SecurityTestResult>;
}

export interface SecurityTestResult {
  passed: boolean;
  findings: SecurityFinding[];
  recommendations: string[];
}

export interface SecurityFinding {
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location?: string;
  mitigation?: string;
}

export class ContractTestingFramework {
  private networkClient: OGNetworkClient;
  private contractExplorer: ContractExplorer;
  private testSuites: Map<string, TestCase[]> = new Map();
  private securityTests: SecurityTest[] = [];
  private testResults: Map<string, TestSuiteResult> = new Map();
  
  constructor(networkClient: OGNetworkClient, contractExplorer: ContractExplorer) {
    this.networkClient = networkClient;
    this.contractExplorer = contractExplorer;
    this.initializeSecurityTests();
  }

  /**
   * Generate and run comprehensive tests for a contract
   */
  async testContract(
    contractAddress: string,
    options: {
      includeFunctionTests?: boolean;
      includeSecurityTests?: boolean;
      includeGasAnalysis?: boolean;
      customTests?: TestCase[];
      maxGasLimit?: number;
    } = {}
  ): Promise<TestSuiteResult> {
    try {
      const opts = {
        includeFunctionTests: true,
        includeSecurityTests: true,
        includeGasAnalysis: true,
        customTests: [],
        maxGasLimit: 1000000,
        ...options
      };

      console.log(`🧪 Starting comprehensive testing for contract: ${contractAddress}`);

      // Explore the contract first
      const explorationResult = await this.contractExplorer.exploreContracts({ 
        address: contractAddress,
        includeTools: true
      });

      if (!explorationResult.success || explorationResult.contracts.length === 0) {
        throw new Error(`Failed to analyze contract ${contractAddress}`);
      }

      const contractData = explorationResult.contracts[0];
      const contractInfo = contractData.contractInfo;

      // Generate test cases
      const testCases: TestCase[] = [];
      
      if (opts.includeFunctionTests) {
        const functionTests = this.generateFunctionTests(contractInfo, opts.maxGasLimit);
        testCases.push(...functionTests);
      }

      if (opts.includeGasAnalysis) {
        const gasTests = this.generateGasAnalysisTests(contractInfo);
        testCases.push(...gasTests);
      }

      // Add custom tests
      if (opts.customTests) {
        testCases.push(...opts.customTests);
      }

      // Execute test cases
      const startTime = Date.now();
      const testResults: TestResult[] = [];
      let totalGasUsed = BigInt(0);

      for (const testCase of testCases) {
        console.log(`🔬 Running test: ${testCase.name}`);
        
        try {
          const result = await this.executeTestCase(testCase, contractInfo);
          testResults.push(result);
          
          if (result.gasUsed) {
            totalGasUsed += BigInt(result.gasUsed);
          }
        } catch (error) {
          testResults.push({
            testId: testCase.id,
            testName: testCase.name,
            success: false,
            executionTime: 0,
            gasUsed: '0',
            error: error instanceof Error ? error.message : 'Test execution failed',
            warnings: [],
            details: {}
          });
        }
      }

      // Run security tests
      let securityFindings: SecurityFinding[] = [];
      if (opts.includeSecurityTests) {
        console.log('🔒 Running security analysis...');
        securityFindings = await this.runSecurityTests(contractInfo);
      }

      // Calculate coverage
      const coverage = this.calculateTestCoverage(contractInfo, testResults);

      // Generate recommendations
      const recommendations = this.generateTestRecommendations(
        testResults, 
        coverage, 
        securityFindings
      );

      const suiteResult: TestSuiteResult = {
        suiteId: `suite_${contractAddress.slice(2, 8)}_${Date.now()}`,
        suiteName: `Comprehensive Test Suite for ${contractInfo.name || contractAddress}`,
        contractAddress,
        totalTests: testResults.length,
        passedTests: testResults.filter(r => r.success).length,
        failedTests: testResults.filter(r => !r.success).length,
        totalExecutionTime: Date.now() - startTime,
        totalGasUsed: totalGasUsed.toString(),
        testResults,
        coverage,
        recommendations
      };

      // Cache the results
      this.testResults.set(contractAddress, suiteResult);

      console.log(`✅ Testing completed: ${suiteResult.passedTests}/${suiteResult.totalTests} tests passed`);

      return suiteResult;

    } catch (error) {
      console.error('Contract testing error:', error);
      
      return {
        suiteId: 'error_suite',
        suiteName: 'Failed Test Suite',
        contractAddress,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        totalExecutionTime: 0,
        totalGasUsed: '0',
        testResults: [],
        coverage: {
          functionsTotal: 0,
          functionsTested: 0,
          functionsUntested: [],
          stateVariablesCovered: 0,
          eventsCovered: 0,
          coveragePercentage: 0
        },
        recommendations: [
          'Testing framework encountered an error',
          'Check contract address and network connection',
          error instanceof Error ? error.message : 'Unknown error'
        ]
      };
    }
  }

  /**
   * Generate function tests for all contract functions
   */
  private generateFunctionTests(contractInfo: ContractInfo, maxGasLimit: number): TestCase[] {
    const tests: TestCase[] = [];

    for (const func of contractInfo.functions) {
      if (func.type !== 'function') continue;

      // Basic function call test
      tests.push({
        id: `test_${func.name}_basic`,
        name: `Test ${func.name} - Basic Call`,
        description: `Test basic functionality of ${func.name} function`,
        type: 'function_call',
        contractAddress: contractInfo.address,
        functionName: func.name,
        inputs: this.generateTestInputs(func),
        gasLimit: Math.min(func.gasEstimate || 50000, maxGasLimit),
        shouldFail: false,
        timeout: 30000
      });

      // Edge case tests for payable functions
      if (func.stateMutability === 'payable') {
        tests.push({
          id: `test_${func.name}_zero_value`,
          name: `Test ${func.name} - Zero Value`,
          description: `Test ${func.name} with zero ETH value`,
          type: 'function_call',
          contractAddress: contractInfo.address,
          functionName: func.name,
          inputs: this.generateTestInputs(func),
          gasLimit: Math.min(func.gasEstimate || 50000, maxGasLimit),
          shouldFail: false
        });
      }

      // Input validation tests
      if (func.inputs.length > 0) {
        tests.push({
          id: `test_${func.name}_invalid_inputs`,
          name: `Test ${func.name} - Invalid Inputs`,
          description: `Test ${func.name} with invalid input parameters`,
          type: 'function_call',
          contractAddress: contractInfo.address,
          functionName: func.name,
          inputs: this.generateInvalidInputs(func),
          shouldFail: true
        });
      }
    }

    return tests;
  }

  /**
   * Generate gas analysis tests
   */
  private generateGasAnalysisTests(contractInfo: ContractInfo): TestCase[] {
    const tests: TestCase[] = [];

    for (const func of contractInfo.functions) {
      if (func.stateMutability === 'view' || func.stateMutability === 'pure') {
        continue; // Skip read-only functions
      }

      tests.push({
        id: `gas_test_${func.name}`,
        name: `Gas Analysis - ${func.name}`,
        description: `Analyze gas usage for ${func.name} function`,
        type: 'gas_estimation',
        contractAddress: contractInfo.address,
        functionName: func.name,
        inputs: this.generateTestInputs(func)
      });
    }

    return tests;
  }

  /**
   * Execute a single test case
   */
  private async executeTestCase(testCase: TestCase, contractInfo: ContractInfo): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      switch (testCase.type) {
        case 'function_call':
          return await this.executeFunctionCallTest(testCase, contractInfo);
        
        case 'gas_estimation':
          return await this.executeGasEstimationTest(testCase, contractInfo);
        
        case 'state_verification':
          return await this.executeStateVerificationTest(testCase, contractInfo);
        
        case 'event_emission':
          return await this.executeEventEmissionTest(testCase, contractInfo);
        
        case 'security_check':
          return await this.executeSecurityCheckTest(testCase, contractInfo);
        
        default:
          throw new Error(`Unknown test type: ${testCase.type}`);
      }
    } catch (error) {
      return {
        testId: testCase.id,
        testName: testCase.name,
        success: false,
        executionTime: Date.now() - startTime,
        gasUsed: '0',
        error: error instanceof Error ? error.message : 'Test execution failed',
        warnings: [],
        details: {}
      };
    }
  }

  /**
   * Execute function call test
   */
  private async executeFunctionCallTest(testCase: TestCase, contractInfo: ContractInfo): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const provider = this.networkClient.getProvider();
      if (!provider) {
        throw new Error('Network provider not available');
      }

      const contract = new ethers.Contract(contractInfo.address, contractInfo.abi, provider);
      
      // For read-only functions, call directly
      const func = contractInfo.functions.find(f => f.name === testCase.functionName);
      if (!func) {
        throw new Error(`Function ${testCase.functionName} not found`);
      }

      if (func.stateMutability === 'view' || func.stateMutability === 'pure') {
        const contractFunction = contract.getFunction(testCase.functionName!);
        const result = await contractFunction(...(testCase.inputs || []));
        
        return {
          testId: testCase.id,
          testName: testCase.name,
          success: !testCase.shouldFail,
          executionTime: Date.now() - startTime,
          gasUsed: '0',
          actualOutputs: [result],
          warnings: [],
          details: { result, type: 'read_only' }
        };
      } else {
        // For write functions, estimate gas
        const signer = this.networkClient.getSigner();
        if (!signer) {
          throw new Error('Wallet not connected - required for write function tests');
        }

        const contractWithSigner = contract.connect(signer);
        
        try {
          const contractFunction = contractWithSigner.getFunction(testCase.functionName!);
          const gasEstimate = await contractFunction.estimateGas(
            ...(testCase.inputs || [])
          );
          
          return {
            testId: testCase.id,
            testName: testCase.name,
            success: !testCase.shouldFail,
            executionTime: Date.now() - startTime,
            gasUsed: gasEstimate.toString(),
            warnings: [],
            details: { 
              gasEstimate: gasEstimate.toString(), 
              type: 'gas_estimation',
              note: 'Transaction not executed in test mode'
            }
          };
        } catch (estimateError) {
          if (testCase.shouldFail) {
            return {
              testId: testCase.id,
              testName: testCase.name,
              success: true,
              executionTime: Date.now() - startTime,
              gasUsed: '0',
              warnings: [],
              details: { 
                expectedFailure: true, 
                error: estimateError instanceof Error ? estimateError.message : 'Unknown error' 
              }
            };
          } else {
            throw estimateError;
          }
        }
      }
    } catch (error) {
      if (testCase.shouldFail) {
        return {
          testId: testCase.id,
          testName: testCase.name,
          success: true,
          executionTime: Date.now() - startTime,
          gasUsed: '0',
          warnings: [],
          details: { 
            expectedFailure: true, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        };
      } else {
        throw error;
      }
    }
  }

  /**
   * Execute gas estimation test
   */
  private async executeGasEstimationTest(testCase: TestCase, contractInfo: ContractInfo): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const provider = this.networkClient.getProvider();
      const signer = this.networkClient.getSigner();
      
      if (!provider || !signer) {
        throw new Error('Network provider or signer not available');
      }

      const contract = new ethers.Contract(contractInfo.address, contractInfo.abi, signer);
      
      const contractFunction = contract.getFunction(testCase.functionName!);
      const gasEstimate = await contractFunction.estimateGas(
        ...(testCase.inputs || [])
      );

      const func = contractInfo.functions.find(f => f.name === testCase.functionName);
      const expectedGas = func?.gasEstimate || 50000;
      const gasEfficient = Number(gasEstimate) <= expectedGas * 1.2; // Within 20% of estimate

      return {
        testId: testCase.id,
        testName: testCase.name,
        success: true,
        executionTime: Date.now() - startTime,
        gasUsed: gasEstimate.toString(),
        warnings: gasEfficient ? [] : ['Gas usage higher than expected'],
        details: {
          estimatedGas: gasEstimate.toString(),
          expectedGas,
          efficient: gasEfficient,
          overhead: Number(gasEstimate) - expectedGas
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute state verification test
   */
  private async executeStateVerificationTest(testCase: TestCase, contractInfo: ContractInfo): Promise<TestResult> {
    // Placeholder implementation for state verification
    return {
      testId: testCase.id,
      testName: testCase.name,
      success: true,
      executionTime: 100,
      gasUsed: '0',
      warnings: [],
      details: { type: 'state_verification', note: 'Placeholder implementation' }
    };
  }

  /**
   * Execute event emission test
   */
  private async executeEventEmissionTest(testCase: TestCase, contractInfo: ContractInfo): Promise<TestResult> {
    // Placeholder implementation for event testing
    return {
      testId: testCase.id,
      testName: testCase.name,
      success: true,
      executionTime: 100,
      gasUsed: '0',
      warnings: [],
      details: { type: 'event_emission', note: 'Placeholder implementation' }
    };
  }

  /**
   * Execute security check test
   */
  private async executeSecurityCheckTest(testCase: TestCase, contractInfo: ContractInfo): Promise<TestResult> {
    // Placeholder implementation for security testing
    return {
      testId: testCase.id,
      testName: testCase.name,
      success: true,
      executionTime: 200,
      gasUsed: '0',
      warnings: [],
      details: { type: 'security_check', note: 'Placeholder implementation' }
    };
  }

  /**
   * Generate test inputs for a function
   */
  private generateTestInputs(func: ContractFunction): any[] {
    return func.inputs.map(input => {
      switch (input.type) {
        case 'uint256':
        case 'uint':
          return '1000';
        case 'int256':
        case 'int':
          return '100';
        case 'address':
          return '0x742d35Cc6134C31532085d59b7ED0C5a168D6dE';
        case 'bool':
          return true;
        case 'string':
          return 'test_string';
        case 'bytes32':
          return '0x' + '00'.repeat(32);
        case 'bytes':
          return '0x1234';
        default:
          if (input.type.includes('[]')) {
            return [];
          }
          return '0';
      }
    });
  }

  /**
   * Generate invalid inputs for testing
   */
  private generateInvalidInputs(func: ContractFunction): any[] {
    return func.inputs.map(input => {
      switch (input.type) {
        case 'uint256':
        case 'uint':
          return '-1'; // Invalid for unsigned
        case 'address':
          return 'invalid_address';
        case 'bool':
          return 'not_a_boolean';
        default:
          return null;
      }
    });
  }

  /**
   * Run security tests on contract
   */
  private async runSecurityTests(contractInfo: ContractInfo): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    for (const securityTest of this.securityTests) {
      try {
        const result = await securityTest.checkFunction(contractInfo);
        findings.push(...result.findings);
      } catch (error) {
        console.warn(`Security test ${securityTest.name} failed:`, error);
      }
    }

    return findings;
  }

  /**
   * Calculate test coverage
   */
  private calculateTestCoverage(contractInfo: ContractInfo, testResults: TestResult[]): TestCoverage {
    const totalFunctions = contractInfo.functions.filter(f => f.type === 'function').length;
    const testedFunctions = new Set(
      testResults
        .filter(r => r.success)
        .map(r => r.testName.match(/Test (\w+) -/)?.[1])
        .filter(Boolean)
    );
    
    const untestedFunctions = contractInfo.functions
      .filter(f => f.type === 'function' && !testedFunctions.has(f.name))
      .map(f => f.name);

    const coveragePercentage = totalFunctions > 0 ? 
      (testedFunctions.size / totalFunctions) * 100 : 0;

    return {
      functionsTotal: totalFunctions,
      functionsTested: testedFunctions.size,
      functionsUntested: untestedFunctions,
      stateVariablesCovered: 0, // Placeholder
      eventsCovered: 0, // Placeholder
      coveragePercentage: Math.round(coveragePercentage)
    };
  }

  /**
   * Generate testing recommendations
   */
  private generateTestRecommendations(
    testResults: TestResult[], 
    coverage: TestCoverage, 
    securityFindings: SecurityFinding[]
  ): string[] {
    const recommendations: string[] = [];

    // Coverage recommendations
    if (coverage.coveragePercentage < 80) {
      recommendations.push(`Test coverage is ${coverage.coveragePercentage}% - consider adding more tests`);
    }
    if (coverage.functionsUntested.length > 0) {
      recommendations.push(`Untested functions: ${coverage.functionsUntested.join(', ')}`);
    }

    // Test results recommendations
    const failedTests = testResults.filter(r => !r.success);
    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length} tests failed - review implementation`);
    }

    // Gas recommendations
    const highGasTests = testResults.filter(r => 
      r.gasUsed && Number(r.gasUsed) > 500000
    );
    if (highGasTests.length > 0) {
      recommendations.push('Some functions have high gas usage - consider optimization');
    }

    // Security recommendations
    const criticalFindings = securityFindings.filter(f => f.severity === 'critical');
    if (criticalFindings.length > 0) {
      recommendations.push(`${criticalFindings.length} critical security issues found`);
    }

    if (recommendations.length === 0) {
      recommendations.push('All tests passed successfully');
      recommendations.push('Contract appears to be well-tested');
    }

    return recommendations;
  }

  /**
   * Initialize security tests
   */
  private initializeSecurityTests(): void {
    this.securityTests = [
      {
        name: 'Reentrancy Check',
        description: 'Check for potential reentrancy vulnerabilities',
        category: 'reentrancy',
        severity: 'high',
        checkFunction: async (contractInfo) => {
          const findings: SecurityFinding[] = [];
          
          // Look for external calls followed by state changes
          const hasExternalCalls = contractInfo.functions.some(f => 
            f.name.toLowerCase().includes('call') || 
            f.name.toLowerCase().includes('transfer')
          );
          
          if (hasExternalCalls && !contractInfo.functions.some(f => 
            f.name.toLowerCase().includes('nonreentrant')
          )) {
            findings.push({
              severity: 'medium',
              title: 'Potential Reentrancy Risk',
              description: 'Contract has external calls but no reentrancy protection detected',
              mitigation: 'Consider using reentrancy guards'
            });
          }
          
          return { passed: findings.length === 0, findings, recommendations: [] };
        }
      },
      {
        name: 'Access Control Check',
        description: 'Check for proper access control mechanisms',
        category: 'access_control',
        severity: 'medium',
        checkFunction: async (contractInfo) => {
          const findings: SecurityFinding[] = [];
          
          const hasOwnership = contractInfo.functions.some(f => 
            f.name.toLowerCase().includes('owner')
          );
          
          const hasModifiers = contractInfo.functions.some(f => 
            f.name.toLowerCase().includes('only')
          );
          
          if (hasOwnership && !hasModifiers) {
            findings.push({
              severity: 'medium',
              title: 'Missing Access Control',
              description: 'Contract has ownership but may lack proper access modifiers',
              mitigation: 'Implement proper access control modifiers'
            });
          }
          
          return { passed: findings.length === 0, findings, recommendations: [] };
        }
      }
    ];
  }

  /**
   * Get test results for a contract
   */
  getTestResults(contractAddress: string): TestSuiteResult | undefined {
    return this.testResults.get(contractAddress.toLowerCase());
  }

  /**
   * Get all test results
   */
  getAllTestResults(): Map<string, TestSuiteResult> {
    return new Map(this.testResults);
  }

  /**
   * Clear test results
   */
  clearTestResults(): void {
    this.testResults.clear();
  }
}

export default ContractTestingFramework;