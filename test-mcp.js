#!/usr/bin/env node

// Simple test script to verify MCP server functionality
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing 0G MCP Server...\n');

// Test the MCP server
const server = spawn('node', [join(__dirname, 'dist', 'mcp-server.js')], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Test messages
const testMessages = [
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  },
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'connect_to_0g',
      arguments: {}
    }
  },
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'get_network_info',
      arguments: {}
    }
  }
];

let messageIndex = 0;

// Handle server responses
server.stdout.on('data', (data) => {
  const response = data.toString();
  console.log('📤 Server Response:', response);
  
  // Send next test message
  if (messageIndex < testMessages.length) {
    const message = JSON.stringify(testMessages[messageIndex]) + '\n';
    console.log('📨 Sending:', testMessages[messageIndex].method);
    server.stdin.write(message);
    messageIndex++;
  } else {
    // Close the server
    server.stdin.end();
  }
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server Error:', error);
});

// Handle server exit
server.on('exit', (code) => {
  console.log(`\n✅ Test completed with exit code: ${code}`);
});

// Start the test
setTimeout(() => {
  console.log('🚀 Starting MCP server test...\n');
  const firstMessage = JSON.stringify(testMessages[0]) + '\n';
  server.stdin.write(firstMessage);
  messageIndex = 1;
}, 1000);
