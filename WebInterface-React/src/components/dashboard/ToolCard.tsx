import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { MCPTool, ActivityItem } from '../../types';

interface ToolCardProps {
  tool: MCPTool;
  addActivity: (activity: Omit<ActivityItem, 'id'>) => void;
  notificationHook: {
    addNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  };
}

const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  addActivity,
  notificationHook
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const needsInput = ['get_balance', 'analyze_contract', 'generate_tools', 'test_contract'].includes(tool.id);

  const executeNetworkTool = async (toolName: string, inputData?: string) => {
    let endpoint: string;
    let data: any = undefined;

    switch (toolName) {
      case 'connect_to_0g':
        endpoint = '/api/v1/network/connect';
        break;
      case 'get_network_info':
        endpoint = '/api/v1/network/status';
        break;
      case 'get_balance':
        if (!inputData) {
          notificationHook.addNotification('Please enter a wallet address', 'error');
          return false;
        }
        endpoint = '/api/v1/blockchain/balance';
        data = { address: inputData };
        break;
      default:
        notificationHook.addNotification('Tool not implemented yet', 'info');
        return false;
    }

    const result = await apiService.makeRequest(endpoint, data ? 'POST' : 'GET', data);
    return result?.success || false;
  };

  const executeStorageTool = async (toolName: string, inputData?: string) => {
    let endpoint: string;
    let data: any = undefined;

    switch (toolName) {
      case 'download_file':
        if (!inputData) {
          notificationHook.addNotification('Please enter a root hash', 'error');
          return false;
        }
        endpoint = '/api/v1/storage/download';
        data = { rootHash: inputData };
        break;
      case 'calculate_merkle':
        endpoint = '/api/v1/storage/merkle';
        break;
      case 'get_file_info':
        if (!inputData) {
          notificationHook.addNotification('Please enter a root hash', 'error');
          return false;
        }
        endpoint = '/api/v1/storage/info';
        data = { rootHash: inputData };
        break;
      default:
        notificationHook.addNotification('Storage tool not implemented yet', 'info');
        return false;
    }

    const result = await apiService.makeRequest(endpoint, 'POST', data);
    return result?.success || false;
  };

  const executeAITool = async (toolName: string) => {
    let endpoint: string;

    switch (toolName) {
      case 'initialize_ai':
        endpoint = '/api/v1/ai/initialize';
        break;
      case 'get_suggestions':
        endpoint = '/api/v1/ai/suggestions';
        break;
      case 'learning_insights':
        endpoint = '/api/v1/ai/insights';
        break;
      case 'memory_stats':
        endpoint = '/api/v1/ai/memory-stats';
        break;
      default:
        notificationHook.addNotification('AI tool not implemented yet', 'info');
        return false;
    }

    const result = await apiService.makeRequest(endpoint, 'POST');
    return result?.success || false;
  };

  const executeContractTool = async (toolName: string, inputData?: string) => {
    let endpoint: string;
    let data: any = undefined;

    switch (toolName) {
      case 'analyze_contract':
        if (!inputData) {
          notificationHook.addNotification('Please enter a contract address', 'error');
          return false;
        }
        endpoint = '/api/v1/contract/analyze';
        data = { address: inputData };
        break;
      case 'generate_tools':
        if (!inputData) {
          notificationHook.addNotification('Please enter a contract address', 'error');
          return false;
        }
        endpoint = '/api/v1/contract/generate-tools';
        data = { address: inputData };
        break;
      case 'test_contract':
        if (!inputData) {
          notificationHook.addNotification('Please enter a contract address', 'error');
          return false;
        }
        endpoint = '/api/v1/contract/test';
        data = { address: inputData };
        break;
      case 'execute_workflow':
        endpoint = '/api/v1/contract/execute-workflow';
        break;
      default:
        notificationHook.addNotification('Contract tool not implemented yet', 'info');
        return false;
    }

    const result = await apiService.makeRequest(endpoint, 'POST', data);
    return result?.success || false;
  };

  const handleExecuteTool = async () => {
    setIsExecuting(true);

    try {
      let success = false;

      switch (tool.category) {
        case 'network':
          success = await executeNetworkTool(tool.id, inputValue);
          break;
        case 'storage':
          success = await executeStorageTool(tool.id, inputValue);
          break;
        case 'ai':
          success = await executeAITool(tool.id);
          break;
        case 'contract':
          success = await executeContractTool(tool.id, inputValue);
          break;
        default:
          notificationHook.addNotification('Unknown tool category', 'error');
          return;
      }

      if (success) {
        notificationHook.addNotification(`${tool.name} executed successfully`, 'success');
        addActivity({
          type: tool.category,
          text: `${tool.name} executed`,
          time: 'Just now',
          icon: tool.icon
        });
        setInputValue(''); // Clear input after successful execution
      }
    } catch (error) {
      notificationHook.addNotification('Tool execution failed', 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="tool-card">
      <h4>
        <i className={tool.icon}></i>
        {tool.name}
      </h4>
      <p>{tool.description}</p>

      {needsInput && (
        <div className="tool-input">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              tool.id.includes('balance') ? 'Wallet address' :
              tool.id.includes('contract') ? 'Contract address (0x...)' :
              tool.id.includes('hash') ? 'Root hash (0x...)' :
              'Enter value...'
            }
          />
        </div>
      )}

      <button
        className="btn-primary tool-btn"
        onClick={handleExecuteTool}
        disabled={isExecuting}
      >
        <i className={`fas ${isExecuting ? 'fa-spinner fa-spin' : 'fa-play'}`}></i>
        {isExecuting ? 'Executing...' : 'Execute'}
      </button>
    </div>
  );
};

export default ToolCard;