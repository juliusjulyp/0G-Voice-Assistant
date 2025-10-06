# 0G Voice Assistant - Comprehensive Testing Guide

## 🧪 **Testing Overview**

This guide provides step-by-step instructions for testing all components of the 0G Voice Assistant project, including network connectivity, MCP server functionality, wallet integration, and the web interface.

## 📋 **Pre-Testing Checklist**

- [x] Project built successfully (`npm run build`)
- [x] All dependencies installed (`npm install`)
- [x] TypeScript compilation passes without errors
- [ ] Network connectivity verified 

## 🚀 **Step-by-Step Testing Procedures**

### **Phase 1:  Network Connectivity Tests**

#### ** Network Client Test**
```bash
# Test the network client directly
node -e "
import { OGNetworkClient } from './dist/network-client.js';
const client = new OGNetworkClient();
console.log('Testing 0G network connection...');
try {
  const connected = await client.connect();
  console.log('✅ Connected:', connected);
  if (connected) {
    const info = await client.getNetworkInfo();
    console.log('📊 Network Info:', info);
  }
} catch (error) {
  console.log('❌ Connection failed:', error.message);
}
"
```

#### ** Network Test**
```bash
# Run the  network connectivity test
node src/simple-test.cjs
```

### **Phase 2: MCP Server Testing**

#### ** MCP Server Functionality**
```bash
# Run the main MCP server test
node test-mcp.js
```

**Expected Output:**
```
🧪 Testing 0G MCP Server...
🚀 0G Voice Assistant MCP Server initialized
✅ All 11 tools properly registered
✅ Network connection handled gracefully
✅ Error messages are user-friendly
```



### **Phase 3: Wallet Integration Testing**

#### **Test 3.1: Wallet Connection Test**
```bash
# Test wallet integration (use test private key)
node test-wallet-integration.js
```



### **Phase 4: Web Interface Testing**

#### **Test 4.1: Web Interface Launch**
```bash
# Open the web interface in a browser
# Option 1: Use the browser tool
# Option 2: Open file directly


### **Phase 5: Integration Testing**

#### **Test 5.1: End-to-End MCP Flow**
```bash
# Test complete MCP workflow
node -e "
import { spawn } from 'child_process';
const server = spawn('node', ['dist/mcp-server.js'], { stdio: ['pipe', 'pipe', 'inherit'] });

const workflow = [
  // Connect to network
  { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'connect_to_0g', arguments: {} }},
  // Get network info
  { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get_network_info', arguments: {} }},
  // Get gas price
  { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_gas_price', arguments: {} }},
  // Estimate gas for transaction
  { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'estimate_gas', arguments: { to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0C8Cc', value: '0.1' } }}
];

let step = 0;
server.stdout.on('data', (data) => {
  console.log('📤 Response:', data.toString());
  if (step < workflow.length) {
    const message = JSON.stringify(workflow[step]) + '\\n';
    server.stdin.write(message);
    step++;
  } else {
    server.stdin.end();
  }
});

setTimeout(() => {
  server.stdin.write(JSON.stringify(workflow[0]) + '\\n');
  step = 1;
}, 1000);
"
```

## 🔍 **Expected Test Results**

### **Successful Network Connection**
```
✅ Connected: true
📊 Network Info: {
  blockNumber: 6488411,
  gasPrice: "0.001000013 gwei",
  network: "0G Galileo Testnet",
  chainId: 16601
}
```

### **Successful MCP Server Test**
```
🧪 Testing 0G MCP Server...
🚀 0G Voice Assistant MCP Server initialized
✅ Successfully connected to 0G Galileo Testnet!
📊 0G Network Information: {...}
```

### **Successful Wallet Integration**
```
🔐 Wallet connected successfully!
👛 Wallet Information: Address: 0x1234...abcdef, Balance: 0.0 A0GI
⛽ Current Gas Price: 0.001 gwei
```

