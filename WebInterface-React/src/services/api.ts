import { ApiResponse, NetworkStatusResponse } from '../types';
import { env } from '../config/env';

const API_BASE = env.API_BASE_URL;

class ApiService {
  private controller: AbortController | null = null;

  async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', 
    data?: any,
    options: { timeout?: number; signal?: AbortSignal } = {}
  ): Promise<ApiResponse<T>> {
    // Cancel previous request if still pending
    if (this.controller) {
      this.controller.abort();
    }

    this.controller = new AbortController();
    const signal = options.signal || this.controller.signal;

    try {
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(env.ENABLE_CSRF_PROTECTION && {
            'X-Requested-With': 'XMLHttpRequest'
          })
        },
        signal,
      };

      if (data) {
        requestOptions.body = JSON.stringify(data);
      }

      // Set timeout
      const timeout = options.timeout || env.API_TIMEOUT;
      const timeoutId = setTimeout(() => {
        this.controller?.abort();
      }, timeout);

      const response = await fetch(`${API_BASE}${endpoint}`, requestOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout or cancelled'
          };
        }
        console.error('API call failed:', error);
        return {
          success: false,
          error: error.message || 'API request failed. Please check your connection.'
        };
      }
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    } finally {
      this.controller = null;
    }
  }

  // Cancel all pending requests
  cancelRequests(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

  // Health Check
  async checkHealth(): Promise<ApiResponse> {
    return this.makeRequest('/health');
  }

  // Network Operations
  async connectToNetwork(): Promise<ApiResponse> {
    return this.makeRequest('/api/v1/network/connect', 'POST');
  }

  async getNetworkInfo(): Promise<NetworkStatusResponse> {
    const response = await fetch(`${API_BASE}/api/v1/network/status`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async getBalance(address?: string): Promise<ApiResponse> {
    if (address) {
      return this.makeRequest('/api/v1/blockchain/balance', 'POST', { address });
    } else {
      // For user's own balance, we need to call the endpoint without an address
      return this.makeRequest('/api/v1/blockchain/balance', 'POST', {});
    }
  }

  // Contract Operations
  async analyzeContract(address: string): Promise<any> {
    return this.makeRequest('/api/v1/contract/analyze', 'POST', { address });
  }

  async generateContractTools(address: string): Promise<any> {
    return this.makeRequest('/api/v1/contract/generate-tools', 'POST', { address });
  }

  async testContract(address: string): Promise<ApiResponse> {
    return this.makeRequest('/api/v1/contract/test', 'POST', { address });
  }

  async executeWorkflow(): Promise<ApiResponse> {
    return this.makeRequest('/api/v1/contract/execute-workflow', 'POST');
  }

  // Storage Operations
  async uploadFile(file: File): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/api/v1/storage/upload`, {
        method: 'POST',
        body: formData
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: 'File upload failed'
      };
    }
  }

  async downloadFile(rootHash: string): Promise<ApiResponse> {
    return this.makeRequest('/api/v1/storage/download', 'POST', { rootHash });
  }

  async calculateMerkle(): Promise<ApiResponse> {
    return this.makeRequest('/api/v1/storage/merkle', 'POST');
  }

  async getFileInfo(rootHash: string): Promise<ApiResponse> {
    return this.makeRequest('/api/v1/storage/info', 'POST', { rootHash });
  }

  // AI Operations
  async initializeAI(): Promise<ApiResponse> {
    return this.makeRequest('/api/v1/ai/initialize', 'POST');
  }

  async getAISuggestions(): Promise<ApiResponse> {
    return this.makeRequest('/api/v1/ai/suggestions', 'POST');
  }

  async getLearningInsights(): Promise<any> {
    return this.makeRequest('/api/v1/ai/insights', 'GET');
  }

  async getMemoryStats(): Promise<any> {
    return this.makeRequest('/api/v1/ai/memory-stats', 'GET');
  }

  // User Operations
  async initializeUser(): Promise<ApiResponse> {
    return this.makeRequest('/api/v1/user/initialize', 'POST');
  }
}

export const apiService = new ApiService();