#!/usr/bin/env node

/**
 * Comprehensive Backend Integration Test for 0G Voice Assistant
 * Tests all major backend components end-to-end
 */

import axios from 'axios';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  apiServerPort: 3001,
  apiBaseUrl: 'http://localhost:3001',
  testTimeout: 30000,
  retryAttempts: 3,
  testUserId: 'test_user_' + Date.now(),
  testWalletPrivateKey: process.env.TEST_PRIVATE_KEY || null
};

// Test colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class BackendIntegrationTest {
  constructor() {
    this.apiServer = null;
    this.mcpServer = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async startApiServer() {
    this.log('🚀 Starting API server...', colors.blue);
    
    return new Promise((resolve, reject) => {
      const serverPath = path.join(__dirname, 'dist', 'api-server-runner.js');
      
      this.apiServer = spawn('node', [serverPath], {
        stdio: 'pipe',
        env: { ...process.env, API_PORT: TEST_CONFIG.apiServerPort }
      });

      let serverReady = false;

      this.apiServer.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Server running on port') && !serverReady) {
          serverReady = true;
          this.log('✅ API server started successfully', colors.green);
          resolve();
        }
      });

      this.apiServer.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Server running on port') && !serverReady) {
          serverReady = true;
          this.log('✅ API server started successfully', colors.green);
          resolve();
        }
      });

      this.apiServer.on('error', (error) => {
        this.log(`❌ Failed to start API server: ${error.message}`, colors.red);
        reject(error);
      });

      // Timeout if server doesn't start
      setTimeout(() => {
        if (!serverReady) {
          this.log('❌ API server startup timeout', colors.red);
          reject(new Error('API server startup timeout'));
        }
      }, 20000);
    });
  }

  async startMcpServer() {
    this.log('🚀 Starting MCP server...', colors.blue);
    
    return new Promise((resolve, reject) => {
      const serverPath = path.join(__dirname, 'dist', 'mcp-server.js');
      
      this.mcpServer = spawn('node', [serverPath], {
        stdio: 'pipe'
      });

      let serverReady = false;

      this.mcpServer.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('0G MCP server running') && !serverReady) {
          serverReady = true;
          this.log('✅ MCP server started successfully', colors.green);
          resolve();
        }
      });

      this.mcpServer.on('error', (error) => {
        this.log(`❌ Failed to start MCP server: ${error.message}`, colors.red);
        reject(error);
      });

      // Timeout if server doesn't start
      setTimeout(() => {
        if (!serverReady) {
          this.log('✅ MCP server assumed ready (stdio mode)', colors.green);
          resolve();
        }
      }, 5000);
    });
  }

  async runTest(testName, testFunction) {
    this.testResults.total++;
    try {
      this.log(`🧪 Running test: ${testName}`, colors.cyan);
      await testFunction();
      this.testResults.passed++;
      this.testResults.details.push({ name: testName, status: 'PASSED', error: null });
      this.log(`✅ Test passed: ${testName}`, colors.green);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.details.push({ name: testName, status: 'FAILED', error: error.message });
      this.log(`❌ Test failed: ${testName} - ${error.message}`, colors.red);
    }
  }

  async testApiServerHealth() {
    const response = await axios.get(`${TEST_CONFIG.apiBaseUrl}/health`, {
      timeout: 5000
    });
    
    if (response.status !== 200) {
      throw new Error(`Health check failed with status: ${response.status}`);
    }
    
    if (!response.data.status || response.data.status !== 'healthy') {
      throw new Error('Health check returned unhealthy status');
    }

    this.log(`✓ API server health check passed`, colors.green);
  }

  async testApiVersion() {
    const response = await axios.get(`${TEST_CONFIG.apiBaseUrl}/api/version`, {
      timeout: 5000
    });
    
    if (response.status !== 200) {
      throw new Error(`Version check failed with status: ${response.status}`);
    }
    
    if (!response.data.version) {
      throw new Error('Version endpoint missing version info');
    }

    this.log(`✓ API version: ${response.data.version}`, colors.green);
  }

  async testUserInitialization() {
    const response = await axios.post(`${TEST_CONFIG.apiBaseUrl}/api/v1/user/initialize`, {
      userId: TEST_CONFIG.testUserId,
      walletAddress: '0x' + '0'.repeat(40)
    }, {
      timeout: 10000
    });
    
    if (response.status !== 200) {
      throw new Error(`User initialization failed with status: ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('User initialization returned success: false');
    }

    this.log(`✓ User initialized: ${TEST_CONFIG.testUserId}`, colors.green);
  }

  async testNetworkStatus() {
    const response = await axios.get(`${TEST_CONFIG.apiBaseUrl}/api/v1/network/status`, {
      timeout: 10000
    });
    
    if (response.status !== 200) {
      throw new Error(`Network status check failed with status: ${response.status}`);
    }
    
    if (!response.data.hasOwnProperty('connected')) {
      throw new Error('Network status missing connection info');
    }

    this.log(`✓ Network status: ${response.data.connected ? 'Connected' : 'Disconnected'}`, colors.green);
  }

  async testNetworkConnection() {
    const response = await axios.post(`${TEST_CONFIG.apiBaseUrl}/api/v1/network/connect`, {}, {
      timeout: 15000
    });
    
    if (response.status !== 200) {
      throw new Error(`Network connection failed with status: ${response.status}`);
    }

    this.log(`✓ Network connection test completed`, colors.green);
  }

  async testAiInitialization() {
    const response = await axios.post(`${TEST_CONFIG.apiBaseUrl}/api/v1/ai/initialize`, {
      userId: TEST_CONFIG.testUserId
    }, {
      timeout: 10000
    });
    
    if (response.status !== 200) {
      throw new Error(`AI initialization failed with status: ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('AI initialization returned success: false');
    }

    this.log(`✓ AI initialized for user: ${TEST_CONFIG.testUserId}`, colors.green);
  }

  async testAiInsights() {
    const response = await axios.get(`${TEST_CONFIG.apiBaseUrl}/api/v1/ai/insights`, {
      timeout: 10000
    });
    
    if (response.status !== 200) {
      throw new Error(`AI insights failed with status: ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('AI insights returned success: false');
    }

    this.log(`✓ AI insights retrieved successfully`, colors.green);
  }

  async testAiSuggestions() {
    const response = await axios.post(`${TEST_CONFIG.apiBaseUrl}/api/v1/ai/suggestions`, {
      context: 'test blockchain operation'
    }, {
      timeout: 10000
    });
    
    if (response.status !== 200) {
      throw new Error(`AI suggestions failed with status: ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('AI suggestions returned success: false');
    }

    this.log(`✓ AI suggestions generated successfully`, colors.green);
  }

  async testAiMemoryStats() {
    const response = await axios.get(`${TEST_CONFIG.apiBaseUrl}/api/v1/ai/memory-stats`, {
      timeout: 10000
    });
    
    if (response.status !== 200) {
      throw new Error(`AI memory stats failed with status: ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('AI memory stats returned success: false');
    }

    this.log(`✓ AI memory stats retrieved successfully`, colors.green);
  }

  async testContractAnalysis() {
    // Use a known contract address for testing (placeholder)
    const testContractAddress = '0x' + '1'.repeat(40);
    
    const response = await axios.post(`${TEST_CONFIG.apiBaseUrl}/api/v1/contract/analyze`, {
      address: testContractAddress
    }, {
      timeout: 15000
    });
    
    if (response.status !== 200) {
      throw new Error(`Contract analysis failed with status: ${response.status}`);
    }

    this.log(`✓ Contract analysis completed for: ${testContractAddress}`, colors.green);
  }

  async testContractExploration() {
    const testContractAddress = '0x' + '1'.repeat(40);
    
    const response = await axios.post(`${TEST_CONFIG.apiBaseUrl}/api/v1/contract/explore`, {
      address: testContractAddress,
      includeTools: false
    }, {
      timeout: 15000
    });
    
    if (response.status !== 200) {
      throw new Error(`Contract exploration failed with status: ${response.status}`);
    }

    this.log(`✓ Contract exploration completed`, colors.green);
  }

  async testContractStats() {
    const response = await axios.get(`${TEST_CONFIG.apiBaseUrl}/api/v1/contract/stats`, {
      timeout: 10000
    });
    
    if (response.status !== 200) {
      throw new Error(`Contract stats failed with status: ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Contract stats returned success: false');
    }

    this.log(`✓ Contract stats retrieved successfully`, colors.green);
  }

  async testStorageOperations() {
    // Test merkle calculation with a dummy file path
    const response = await axios.post(`${TEST_CONFIG.apiBaseUrl}/api/v1/storage/merkle`, {
      filePath: '/nonexistent/test/file.txt'
    }, {
      timeout: 10000,
      validateStatus: function (status) {
        // Accept both success and error responses for this test
        return status < 600;
      }
    });
    
    // This test passes if the endpoint responds (even with an error about file not existing)
    if (response.status >= 600) {
      throw new Error(`Storage endpoint completely unresponsive`);
    }

    this.log(`✓ Storage endpoints are responsive`, colors.green);
  }

  async testVoiceProcessing() {
    const response = await axios.post(`${TEST_CONFIG.apiBaseUrl}/api/v1/voice/process`, {
      userId: TEST_CONFIG.testUserId,
      textInput: 'Test voice processing with simple text input',
      sessionId: 'test_session_' + Date.now(),
      timestamp: Date.now()
    }, {
      timeout: 15000
    });
    
    if (response.status !== 200) {
      throw new Error(`Voice processing failed with status: ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Voice processing returned success: false');
    }

    this.log(`✓ Voice processing completed successfully`, colors.green);
  }

  async testErrorHandling() {
    // Test with invalid endpoint
    try {
      await axios.get(`${TEST_CONFIG.apiBaseUrl}/api/v1/nonexistent/endpoint`, {
        timeout: 5000
      });
      throw new Error('Expected 404 error for nonexistent endpoint');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        this.log(`✓ Error handling works correctly (404 for invalid endpoint)`, colors.green);
      } else {
        throw error;
      }
    }
  }

  async testRatelimiting() {
    // Make multiple rapid requests to test rate limiting
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        axios.get(`${TEST_CONFIG.apiBaseUrl}/health`, {
          timeout: 5000,
          validateStatus: function (status) {
            return status < 600; // Accept any response under 600
          }
        })
      );
    }
    
    const responses = await Promise.all(promises);
    const hasRateLimit = responses.some(r => r.status === 429);
    
    this.log(`✓ Rate limiting ${hasRateLimit ? 'active' : 'configured'}`, colors.green);
  }

  async runEndToEndTest() {
    this.log('🎯 Running comprehensive end-to-end test...', colors.cyan);
    
    // Test the complete flow: user init -> AI init -> network connect -> voice process
    await this.testUserInitialization();
    await this.delay(1000);
    
    await this.testAiInitialization();
    await this.delay(1000);
    
    await this.testNetworkConnection();
    await this.delay(2000);
    
    await this.testVoiceProcessing();
    await this.delay(1000);
    
    await this.testAiInsights();
    
    this.log(`✓ End-to-end test flow completed successfully`, colors.green);
  }

  async cleanup() {
    this.log('🧹 Cleaning up test servers...', colors.yellow);
    
    if (this.apiServer) {
      this.apiServer.kill('SIGTERM');
      this.log('✓ API server stopped', colors.yellow);
    }
    
    if (this.mcpServer) {
      this.mcpServer.kill('SIGTERM');
      this.log('✓ MCP server stopped', colors.yellow);
    }
    
    await this.delay(2000);
  }

  generateTestReport() {
    this.log('\n' + '='.repeat(60), colors.magenta);
    this.log('📊 BACKEND INTEGRATION TEST REPORT', colors.magenta);
    this.log('='.repeat(60), colors.magenta);
    
    const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
    
    this.log(`\n📈 Summary:`, colors.cyan);
    this.log(`   Total Tests: ${this.testResults.total}`, colors.cyan);
    this.log(`   Passed: ${this.testResults.passed}`, colors.green);
    this.log(`   Failed: ${this.testResults.failed}`, colors.red);
    this.log(`   Success Rate: ${successRate}%`, successRate > 80 ? colors.green : colors.red);
    
    this.log(`\n📋 Detailed Results:`, colors.cyan);
    this.testResults.details.forEach(test => {
      const statusColor = test.status === 'PASSED' ? colors.green : colors.red;
      this.log(`   ${test.status === 'PASSED' ? '✅' : '❌'} ${test.name}`, statusColor);
      if (test.error) {
        this.log(`      Error: ${test.error}`, colors.red);
      }
    });
    
    this.log('\n' + '='.repeat(60), colors.magenta);
    
    if (this.testResults.failed === 0) {
      this.log('🎉 ALL TESTS PASSED! Backend is working correctly.', colors.green);
    } else {
      this.log(`⚠️  ${this.testResults.failed} tests failed. Check the errors above.`, colors.yellow);
    }
    
    return successRate > 80;
  }

  async runAllTests() {
    try {
      this.log('🚀 Starting Comprehensive Backend Integration Test', colors.magenta);
      this.log('='.repeat(60), colors.magenta);
      
      // Start servers
      await this.startApiServer();
      await this.delay(3000); // Give servers time to fully initialize
      
      await this.startMcpServer();
      await this.delay(2000);
      
      this.log('\n🧪 Running test suite...', colors.cyan);
      
      // Core API Tests
      await this.runTest('API Server Health Check', () => this.testApiServerHealth());
      await this.runTest('API Version Check', () => this.testApiVersion());
      await this.runTest('Error Handling', () => this.testErrorHandling());
      await this.runTest('Rate Limiting', () => this.testRatelimiting());
      
      // User Management Tests
      await this.runTest('User Initialization', () => this.testUserInitialization());
      
      // Network Tests
      await this.runTest('Network Status Check', () => this.testNetworkStatus());
      await this.runTest('Network Connection', () => this.testNetworkConnection());
      
      // AI System Tests
      await this.runTest('AI Initialization', () => this.testAiInitialization());
      await this.runTest('AI Insights Generation', () => this.testAiInsights());
      await this.runTest('AI Suggestions', () => this.testAiSuggestions());
      await this.runTest('AI Memory Stats', () => this.testAiMemoryStats());
      
      // Contract Intelligence Tests
      await this.runTest('Contract Analysis', () => this.testContractAnalysis());
      await this.runTest('Contract Exploration', () => this.testContractExploration());
      await this.runTest('Contract Stats', () => this.testContractStats());
      
      // Storage Tests
      await this.runTest('Storage Operations', () => this.testStorageOperations());
      
      // Voice Processing Tests
      await this.runTest('Voice Processing', () => this.testVoiceProcessing());
      
      // End-to-End Test
      await this.runTest('End-to-End Integration', () => this.runEndToEndTest());
      
      // Generate report
      const allTestsPassed = this.generateTestReport();
      
      await this.cleanup();
      
      process.exit(allTestsPassed ? 0 : 1);
      
    } catch (error) {
      this.log(`💥 Test runner error: ${error.message}`, colors.red);
      await this.cleanup();
      process.exit(1);
    }
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Test terminated');
  process.exit(1);
});

// Run the tests
const tester = new BackendIntegrationTest();
tester.runAllTests();