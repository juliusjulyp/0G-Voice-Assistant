import { ethers } from 'ethers';
import { OGNetworkClient } from './network-client.js';
import ContractExplorer, { ContractExplorationData } from './contract-explorer.js';

export interface WorkflowStep {
  id: string;
  type: 'contract_call' | 'value_transfer' | 'approval' | 'verification' | 'wait';
  description: string;
  contractAddress?: string;
  functionName?: string;
  parameters?: any[];
  value?: string;
  gasLimit?: number;
  dependsOn?: string[];
  conditions?: WorkflowCondition[];
  retryable: boolean;
  timeout?: number;
}

export interface WorkflowCondition {
  type: 'balance_check' | 'allowance_check' | 'ownership_check' | 'custom';
  description: string;
  expression: string;
  errorMessage?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  category: 'defi' | 'nft' | 'token' | 'governance' | 'custom';
  steps: WorkflowStep[];
  totalEstimatedGas: number;
  requiredApprovals: string[];
  riskLevel: 'low' | 'medium' | 'high';
  tags: string[];
}

export interface WorkflowExecution {
  workflowId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  completedSteps: string[];
  failedSteps: string[];
  transactions: WorkflowTransaction[];
  startTime: number;
  endTime?: number;
  totalGasUsed: string;
  errors: string[];
}

export interface WorkflowTransaction {
  stepId: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  status: 'success' | 'failed';
  timestamp: number;
}

export interface WorkflowResult {
  success: boolean;
  execution: WorkflowExecution;
  finalState: any;
  recommendations: string[];
  error?: string;
}

export class ContractWorkflowEngine {
  private networkClient: OGNetworkClient;
  private contractExplorer: ContractExplorer;
  private activeExecutions: Map<string, WorkflowExecution> = new Map();
  private workflowTemplates: Map<string, WorkflowDefinition> = new Map();
  
  constructor(networkClient: OGNetworkClient, contractExplorer: ContractExplorer) {
    this.networkClient = networkClient;
    this.contractExplorer = contractExplorer;
    this.initializeBuiltInWorkflows();
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string, 
    parameters: Record<string, any> = {}
  ): Promise<WorkflowResult> {
    try {
      const workflow = this.workflowTemplates.get(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      console.log(`🚀 Starting workflow execution: ${workflow.name}`);

      const executionId = this.generateExecutionId();
      const execution: WorkflowExecution = {
        workflowId,
        executionId,
        status: 'running',
        currentStep: 0,
        completedSteps: [],
        failedSteps: [],
        transactions: [],
        startTime: Date.now(),
        totalGasUsed: '0',
        errors: []
      };

      this.activeExecutions.set(executionId, execution);

      // Pre-execution validation
      const validation = await this.validateWorkflowExecution(workflow, parameters);
      if (!validation.valid) {
        execution.status = 'failed';
        execution.errors = validation.errors;
        execution.endTime = Date.now();
        
        return {
          success: false,
          execution,
          finalState: {},
          recommendations: validation.recommendations,
          error: validation.errors.join('; ')
        };
      }

      // Execute steps sequentially
      let finalState: any = {};
      
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        execution.currentStep = i;
        
        console.log(`📋 Executing step ${i + 1}/${workflow.steps.length}: ${step.description}`);

        // Check dependencies
        if (step.dependsOn && step.dependsOn.length > 0) {
          const dependenciesMet = step.dependsOn.every(dep => 
            execution.completedSteps.includes(dep)
          );
          
          if (!dependenciesMet) {
            const error = `Step ${step.id} dependencies not met: ${step.dependsOn.join(', ')}`;
            execution.errors.push(error);
            execution.failedSteps.push(step.id);
            continue;
          }
        }

        // Check conditions
        if (step.conditions && step.conditions.length > 0) {
          const conditionsResult = await this.checkStepConditions(step.conditions, parameters);
          if (!conditionsResult.valid) {
            const error = `Step ${step.id} conditions failed: ${conditionsResult.errors.join(', ')}`;
            execution.errors.push(error);
            execution.failedSteps.push(step.id);
            continue;
          }
        }

        // Execute the step
        try {
          const stepResult = await this.executeWorkflowStep(step, parameters, finalState);
          
          if (stepResult.success) {
            execution.completedSteps.push(step.id);
            if (stepResult.transaction) {
              execution.transactions.push(stepResult.transaction);
              execution.totalGasUsed = (
                BigInt(execution.totalGasUsed) + BigInt(stepResult.transaction.gasUsed)
              ).toString();
            }
            finalState = { ...finalState, ...stepResult.result };
          } else {
            execution.failedSteps.push(step.id);
            execution.errors.push(stepResult.error || 'Unknown step error');
            
            if (!step.retryable) {
              break; // Stop execution on non-retryable failure
            }
          }
          
        } catch (error) {
          execution.failedSteps.push(step.id);
          execution.errors.push(error instanceof Error ? error.message : 'Unknown execution error');
          
          if (!step.retryable) {
            break;
          }
        }
      }

      // Determine final status
      execution.status = execution.failedSteps.length === 0 ? 'completed' : 'failed';
      execution.endTime = Date.now();

      const recommendations = this.generateWorkflowRecommendations(execution, workflow);

      console.log(`✅ Workflow execution completed: ${execution.status}`);

      return {
        success: execution.status === 'completed',
        execution,
        finalState,
        recommendations,
        error: execution.errors.length > 0 ? execution.errors.join('; ') : undefined
      };

    } catch (error) {
      console.error('Workflow execution error:', error);
      
      return {
        success: false,
        execution: {
          workflowId,
          executionId: 'error',
          status: 'failed',
          currentStep: 0,
          completedSteps: [],
          failedSteps: [],
          transactions: [],
          startTime: Date.now(),
          endTime: Date.now(),
          totalGasUsed: '0',
          errors: [error instanceof Error ? error.message : 'Unknown workflow error']
        },
        finalState: {},
        recommendations: ['Check network connection', 'Verify workflow parameters', 'Try again with different settings'],
        error: error instanceof Error ? error.message : 'Unknown workflow error'
      };
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeWorkflowStep(
    step: WorkflowStep, 
    parameters: Record<string, any>, 
    currentState: any
  ): Promise<{
    success: boolean;
    result?: any;
    transaction?: WorkflowTransaction;
    error?: string;
  }> {
    switch (step.type) {
      case 'contract_call':
        return await this.executeContractCall(step, parameters, currentState);
      
      case 'value_transfer':
        return await this.executeValueTransfer(step, parameters);
      
      case 'approval':
        return await this.executeApproval(step, parameters);
      
      case 'verification':
        return await this.executeVerification(step, parameters, currentState);
      
      case 'wait':
        return await this.executeWait(step);
      
      default:
        return {
          success: false,
          error: `Unknown step type: ${step.type}`
        };
    }
  }

  /**
   * Execute contract function call
   */
  private async executeContractCall(
    step: WorkflowStep, 
    parameters: Record<string, any>, 
    currentState: any
  ): Promise<any> {
    try {
      if (!step.contractAddress || !step.functionName) {
        throw new Error('Contract address and function name required for contract call');
      }

      const provider = this.networkClient.getProvider();
      const signer = this.networkClient.getSigner();
      
      if (!provider || !signer) {
        throw new Error('Network provider or signer not available');
      }

      // Get contract exploration data for ABI
      const explorationData = await this.contractExplorer.exploreContracts({ 
        address: step.contractAddress 
      });
      
      if (!explorationData.success || explorationData.contracts.length === 0) {
        throw new Error(`Failed to analyze contract ${step.contractAddress}`);
      }

      const contractInfo = explorationData.contracts[0].contractInfo;
      const contract = new ethers.Contract(step.contractAddress, contractInfo.abi, signer);

      // Prepare function parameters
      const functionParams = step.parameters || [];
      const resolvedParams = functionParams.map(param => 
        this.resolveParameter(param, parameters, currentState)
      );

      // Prepare transaction options
      const txOptions: any = {};
      if (step.value) {
        txOptions.value = ethers.parseEther(step.value);
      }
      if (step.gasLimit) {
        txOptions.gasLimit = step.gasLimit;
      }

      // Execute the function call
      const tx = await contract[step.functionName](...resolvedParams, txOptions);
      console.log(`📝 Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      
      return {
        success: true,
        result: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        },
        transaction: {
          stepId: step.id,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: 'success',
          timestamp: Date.now()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Contract call failed'
      };
    }
  }

  /**
   * Execute value transfer
   */
  private async executeValueTransfer(step: WorkflowStep, parameters: Record<string, any>): Promise<any> {
    try {
      const signer = this.networkClient.getSigner();
      if (!signer) {
        throw new Error('Wallet not connected');
      }

      if (!step.value) {
        throw new Error('Value amount required for transfer');
      }

      // Resolve recipient from parameters
      const recipient = parameters.recipient || step.contractAddress;
      if (!recipient) {
        throw new Error('Transfer recipient not specified');
      }

      const tx = await signer.sendTransaction({
        to: recipient,
        value: ethers.parseEther(step.value),
        gasLimit: step.gasLimit || 21000
      });

      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }

      return {
        success: true,
        result: {
          transactionHash: tx.hash,
          recipient,
          amount: step.value
        },
        transaction: {
          stepId: step.id,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: 'success',
          timestamp: Date.now()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Value transfer failed'
      };
    }
  }

  /**
   * Execute token approval
   */
  private async executeApproval(step: WorkflowStep, parameters: Record<string, any>): Promise<any> {
    try {
      // This would implement ERC20 token approval
      // For now, return a placeholder implementation
      
      return {
        success: true,
        result: {
          approved: true,
          spender: step.contractAddress,
          amount: step.value || 'unlimited'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Approval failed'
      };
    }
  }

  /**
   * Execute verification step
   */
  private async executeVerification(
    step: WorkflowStep, 
    parameters: Record<string, any>, 
    currentState: any
  ): Promise<any> {
    try {
      // Implement various verification checks
      if (step.conditions) {
        const conditionsResult = await this.checkStepConditions(step.conditions, parameters);
        return {
          success: conditionsResult.valid,
          result: { verified: conditionsResult.valid },
          error: conditionsResult.valid ? undefined : conditionsResult.errors.join('; ')
        };
      }

      return {
        success: true,
        result: { verified: true }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Execute wait step
   */
  private async executeWait(step: WorkflowStep): Promise<any> {
    try {
      const waitTime = step.timeout || 5000; // Default 5 seconds
      console.log(`⏳ Waiting ${waitTime}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      return {
        success: true,
        result: { waited: waitTime }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Wait failed'
      };
    }
  }

  /**
   * Validate workflow before execution
   */
  private async validateWorkflowExecution(
    workflow: WorkflowDefinition, 
    parameters: Record<string, any>
  ): Promise<{ valid: boolean; errors: string[]; recommendations: string[] }> {
    const errors: string[] = [];
    const recommendations: string[] = [];

    // Check wallet connection
    const signer = this.networkClient.getSigner();
    if (!signer) {
      errors.push('Wallet not connected - required for workflow execution');
      recommendations.push('Connect your wallet before executing workflows');
    }

    // Check network connection
    const provider = this.networkClient.getProvider();
    if (!provider) {
      errors.push('Network provider not available');
      recommendations.push('Check network connection');
    }

    // Validate required parameters
    for (const step of workflow.steps) {
      if (step.parameters) {
        // Check if all required parameters are provided
        // This is a simplified validation
      }
    }

    // Check gas balance for estimated costs
    if (signer && provider) {
      try {
        const balance = await provider.getBalance(await signer.getAddress());
        const estimatedCost = ethers.parseEther('0.1'); // Rough estimate
        
        if (balance < estimatedCost) {
          errors.push('Insufficient balance for estimated gas costs');
          recommendations.push('Add more ETH to your wallet for gas fees');
        }
      } catch (error) {
        recommendations.push('Could not verify gas balance - proceed with caution');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      recommendations
    };
  }

  /**
   * Check step conditions
   */
  private async checkStepConditions(
    conditions: WorkflowCondition[], 
    parameters: Record<string, any>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const condition of conditions) {
      try {
        const result = await this.evaluateCondition(condition, parameters);
        if (!result) {
          errors.push(condition.errorMessage || `Condition failed: ${condition.description}`);
        }
      } catch (error) {
        errors.push(`Condition evaluation error: ${condition.description}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: WorkflowCondition, parameters: Record<string, any>): Promise<boolean> {
    switch (condition.type) {
      case 'balance_check':
        return await this.checkBalance(condition, parameters);
      
      case 'allowance_check':
        return await this.checkAllowance(condition, parameters);
      
      case 'ownership_check':
        return await this.checkOwnership(condition, parameters);
      
      case 'custom':
        // For now, return true for custom conditions
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Check balance condition
   */
  private async checkBalance(condition: WorkflowCondition, parameters: Record<string, any>): Promise<boolean> {
    try {
      const provider = this.networkClient.getProvider();
      const signer = this.networkClient.getSigner();
      
      if (!provider || !signer) return false;
      
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);
      
      // Simple balance check - could be enhanced with more complex expressions
      return balance > ethers.parseEther('0.01');
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Check allowance condition
   */
  private async checkAllowance(condition: WorkflowCondition, parameters: Record<string, any>): Promise<boolean> {
    // Placeholder for ERC20 allowance checking
    return true;
  }

  /**
   * Check ownership condition
   */
  private async checkOwnership(condition: WorkflowCondition, parameters: Record<string, any>): Promise<boolean> {
    // Placeholder for ownership checking
    return true;
  }

  /**
   * Resolve parameter value from various sources
   */
  private resolveParameter(param: any, parameters: Record<string, any>, currentState: any): any {
    if (typeof param === 'string' && param.startsWith('$')) {
      const paramName = param.slice(1);
      return parameters[paramName] || currentState[paramName] || param;
    }
    
    return param;
  }

  /**
   * Generate workflow recommendations
   */
  private generateWorkflowRecommendations(execution: WorkflowExecution, workflow: WorkflowDefinition): string[] {
    const recommendations: string[] = [];

    if (execution.status === 'completed') {
      recommendations.push('Workflow completed successfully');
      recommendations.push(`Total gas used: ${execution.totalGasUsed}`);
      recommendations.push(`Execution time: ${(execution.endTime! - execution.startTime) / 1000}s`);
    } else {
      recommendations.push('Workflow execution failed');
      recommendations.push('Review error messages and retry if appropriate');
      
      if (execution.failedSteps.length > 0) {
        recommendations.push(`Failed steps: ${execution.failedSteps.join(', ')}`);
      }
    }

    if (execution.transactions.length > 0) {
      recommendations.push(`${execution.transactions.length} transactions executed`);
      recommendations.push('Check transaction receipts for detailed results');
    }

    return recommendations;
  }

  /**
   * Generate execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Initialize built-in workflow templates
   */
  private initializeBuiltInWorkflows(): void {
    // Token Swap Workflow
    this.workflowTemplates.set('token_swap', {
      id: 'token_swap',
      name: 'Token Swap',
      description: 'Swap one token for another using a DEX',
      category: 'defi',
      steps: [
        {
          id: 'approve_token',
          type: 'approval',
          description: 'Approve token spending',
          retryable: true
        },
        {
          id: 'execute_swap',
          type: 'contract_call',
          description: 'Execute token swap',
          dependsOn: ['approve_token'],
          retryable: false
        }
      ],
      totalEstimatedGas: 150000,
      requiredApprovals: ['token_approval'],
      riskLevel: 'medium',
      tags: ['defi', 'swap', 'token']
    });

    // NFT Purchase Workflow
    this.workflowTemplates.set('nft_purchase', {
      id: 'nft_purchase',
      name: 'NFT Purchase',
      description: 'Purchase an NFT from a marketplace',
      category: 'nft',
      steps: [
        {
          id: 'verify_nft',
          type: 'verification',
          description: 'Verify NFT availability and price',
          retryable: true
        },
        {
          id: 'purchase_nft',
          type: 'contract_call',
          description: 'Execute NFT purchase',
          dependsOn: ['verify_nft'],
          retryable: false
        }
      ],
      totalEstimatedGas: 200000,
      requiredApprovals: [],
      riskLevel: 'medium',
      tags: ['nft', 'purchase', 'marketplace']
    });
  }

  /**
   * Get available workflow templates
   */
  getAvailableWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflowTemplates.values());
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflowTemplates.get(workflowId);
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): WorkflowExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Cancel workflow execution
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.endTime = Date.now();
      return true;
    }
    return false;
  }
}

export default ContractWorkflowEngine;