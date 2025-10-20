import { create } from 'zustand';
import { DashboardStats, ContractAnalysis, ToolExecution, MCPTool } from '../types';

interface DashboardState {
  // Stats
  stats: DashboardStats;
  updateStats: (stats: Partial<DashboardStats>) => void;

  // Contract Analysis
  contractAnalysis: ContractAnalysis | null;
  setContractAnalysis: (analysis: ContractAnalysis | null) => void;

  // Tool Executions
  toolExecutions: Record<string, ToolExecution>;
  setToolExecution: (toolName: string, execution: Partial<ToolExecution>) => void;

  // Active Tools Category
  activeToolsCategory: 'network' | 'storage' | 'ai' | 'contract';
  setActiveToolsCategory: (category: 'network' | 'storage' | 'ai' | 'contract') => void;

  // Loading States
  isAnalyzing: boolean;
  setIsAnalyzing: (loading: boolean) => void;

  // MCP Tools
  mcpTools: MCPTool[];
  setMCPTools: (tools: MCPTool[]) => void;
}

export const useDashboardStore = create<DashboardState>((set, _get) => ({
  // Initial stats
  stats: {
    toolsCount: 29,
    aiConfidence: 84,
    responseTime: '<500ms',
    networkStatus: {
      connected: false,
      chainId: '16602',
      blockNumber: 0,
      rpcUrl: 'https://0g-galileo-testnet.drpc.org'
    }
  },

  updateStats: (newStats: Partial<DashboardStats>) => set((state: DashboardState) => ({
    stats: { ...state.stats, ...newStats }
  })),

  // Contract Analysis
  contractAnalysis: null,
  setContractAnalysis: (analysis: ContractAnalysis | null) => set({ contractAnalysis: analysis }),

  // Tool Executions
  toolExecutions: {},
  setToolExecution: (toolName: string, execution: Partial<ToolExecution>) => set((state: DashboardState) => ({
    toolExecutions: {
      ...state.toolExecutions,
      [toolName]: {
        ...state.toolExecutions[toolName],
        toolName,
        status: 'idle' as const,
        ...execution
      }
    }
  })),

  // Active Tools Category
  activeToolsCategory: 'network' as const,
  setActiveToolsCategory: (category: 'network' | 'storage' | 'ai' | 'contract') => set({ activeToolsCategory: category }),

  // Loading States
  isAnalyzing: false,
  setIsAnalyzing: (loading: boolean) => set({ isAnalyzing: loading }),

  // MCP Tools
  mcpTools: [
    // Network Operations
    { id: 'connect_to_0g', name: 'Connect to 0G', description: 'Establish connection to 0G Galileo Testnet', category: 'network', icon: 'fas fa-link' },
    { id: 'get_network_info', name: 'Network Info', description: 'Get current network status and information', category: 'network', icon: 'fas fa-info-circle' },
    { id: 'get_balance', name: 'Check Balance', description: 'View wallet balance and token holdings', category: 'network', icon: 'fas fa-coins' },
    { id: 'send_transaction', name: 'Send Transaction', description: 'Send tokens or execute contract functions', category: 'network', icon: 'fas fa-paper-plane' },

    // Storage Operations
    { id: 'upload_file', name: 'Upload File', description: 'Upload files to 0G Storage with Merkle verification', category: 'storage', icon: 'fas fa-upload' },
    { id: 'download_file', name: 'Download File', description: 'Download files from 0G Storage by root hash', category: 'storage', icon: 'fas fa-download' },
    { id: 'calculate_merkle', name: 'Calculate Merkle', description: 'Calculate Merkle root for file verification', category: 'storage', icon: 'fas fa-tree' },
    { id: 'get_file_info', name: 'File Info', description: 'Get information about stored files', category: 'storage', icon: 'fas fa-info' },

    // AI Learning
    { id: 'initialize_ai', name: 'Initialize AI User', description: 'Set up AI learning profile', category: 'ai', icon: 'fas fa-user-plus' },
    { id: 'get_suggestions', name: 'Get Suggestions', description: 'Get personalized AI suggestions', category: 'ai', icon: 'fas fa-lightbulb' },
    { id: 'learning_insights', name: 'Learning Insights', description: 'View AI learning progress and patterns', category: 'ai', icon: 'fas fa-chart-line' },
    { id: 'memory_stats', name: 'Memory Stats', description: 'Check AI memory usage and statistics', category: 'ai', icon: 'fas fa-memory' },

    // Contract Intelligence
    { id: 'analyze_contract', name: 'Analyze Contract', description: 'Deep analysis of smart contract code', category: 'contract', icon: 'fas fa-search' },
    { id: 'generate_tools', name: 'Generate Tools', description: 'Auto-generate MCP tools for contracts', category: 'contract', icon: 'fas fa-magic' },
    { id: 'test_contract', name: 'Test Contract', description: 'Run security and functionality tests', category: 'contract', icon: 'fas fa-flask' },
    { id: 'execute_workflow', name: 'Execute Workflow', description: 'Run multi-step contract workflows', category: 'contract', icon: 'fas fa-cogs' }
  ],

  setMCPTools: (tools: MCPTool[]) => set({ mcpTools: tools })
}));