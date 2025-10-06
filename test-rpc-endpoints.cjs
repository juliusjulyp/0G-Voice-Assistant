#!/usr/bin/env node

//Test to make sure everything is running as expected for rpc endpoints
const https = require('https');
const http = require('http');

// 0G Galileo Testnet configuration
const CHAIN_ID = 16601;
const EXPECTED_CHAIN_ID_HEX = '0x40d9';

// Test endpoints
const ENDPOINTS = [
  'https://evmrpc-testnet.0g.ai',
  'https://galileo-rpc.0g.ai',
  'https://testnet-rpc.0g.ai',
  'https://0g-testnet.rpc.p2p.world',
  'https://docs-demo.quiknode.pro/',
  'https://0g-galileo-testnet.rpc.thirdweb.com',
  'https://rpc.ankr.com/0g_galileo_testnet'
];

// JSON-RPC request payload
const payload = JSON.stringify({
  jsonrpc: '2.0',
  method: 'eth_chainId',
  params: [],
  id: 1
});

function testEndpoint(url) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testing: ${url}`);
    
    const startTime = Date.now();
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname || '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 10000 // 10 second timeout
    };

    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            const chainId = parseInt(response.result, 16);
            
            if (chainId === CHAIN_ID) {
              console.log(`✅ SUCCESS: Chain ID ${chainId} (0x${response.result}) - Response time: ${responseTime}ms`);
              resolve({ url, status: 'success', chainId, responseTime });
            } else {
              console.log(`⚠️  WRONG NETWORK: Chain ID ${chainId} (expected ${CHAIN_ID}) - Response time: ${responseTime}ms`);
              resolve({ url, status: 'wrong_network', chainId, expectedChainId: CHAIN_ID, responseTime });
            }
          } catch (parseError) {
            console.log(`❌ INVALID RESPONSE: ${data.substring(0, 100)}... - Response time: ${responseTime}ms`);
            resolve({ url, status: 'invalid_response', error: parseError.message, responseTime });
          }
        } else {
          console.log(`❌ HTTP ERROR: ${res.statusCode} ${res.statusMessage} - Response time: ${responseTime}ms`);
          resolve({ url, status: 'http_error', statusCode: res.statusCode, statusMessage: res.statusMessage, responseTime });
        }
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      console.log(`❌ CONNECTION ERROR: ${error.message} - Response time: ${responseTime}ms`);
      resolve({ url, status: 'connection_error', error: error.message, responseTime });
    });

    req.on('timeout', () => {
      const responseTime = Date.now() - startTime;
      console.log(`⏰ TIMEOUT: Request timed out after 10 seconds`);
      req.destroy();
      resolve({ url, status: 'timeout', responseTime });
    });

    req.write(payload);
    req.end();
  });
}

async function testAllEndpoints() {
  console.log('🔍 0G Galileo Testnet RPC Endpoint Tester');
  console.log('==========================================');
  console.log(`Expected Chain ID: ${CHAIN_ID} (${EXPECTED_CHAIN_ID_HEX})`);
  console.log(`Testing Method: eth_chainId`);
  console.log('');

  const results = [];
  
  // Test provided endpoints or use defaults
  const endpointsToTest = process.argv.slice(2).length > 0 
    ? process.argv.slice(2) 
    : ENDPOINTS;

  for (const endpoint of endpointsToTest) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }

  // Summary
  console.log('\n📊 SUMMARY');
  console.log('===========');
  
  const successful = results.filter(r => r.status === 'success');
  const wrongNetwork = results.filter(r => r.status === 'wrong_network');
  const failed = results.filter(r => !['success', 'wrong_network'].includes(r.status));

  if (successful.length > 0) {
    console.log('✅ Working endpoints:');
    successful.forEach(r => console.log(`   ${r.url} (Chain ID: ${r.chainId})`));
  }

  if (wrongNetwork.length > 0) {
    console.log('\n⚠️  Wrong network (but reachable):');
    wrongNetwork.forEach(r => console.log(`   ${r.url} (Got Chain ID: ${r.chainId}, Expected: ${CHAIN_ID})`));
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed endpoints:');
    failed.forEach(r => console.log(`   ${r.url} (${r.status}: ${r.error || r.statusMessage})`));
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('===================');
  
  if (successful.length > 0) {
    console.log('✅ Use one of the working endpoints above');
    console.log('   Update your src/network-client.ts RPC_ENDPOINTS array');
  } else if (wrongNetwork.length > 0) {
    console.log('⚠️  Some endpoints are reachable but on wrong networks');
    console.log('   Check if these providers support 0G Galileo Testnet (Chain ID: 16601)');
  } else {
    console.log('🚨 All endpoints failed');
    console.log('   1. Sign up for QuickNode, ThirdWeb, or Ankr');
    console.log('   2. Create a 0G Galileo Testnet endpoint');
    console.log('   3. Test your personal endpoint with: node test-rpc-endpoints.js YOUR_ENDPOINT_URL');
  }
}

// Run the test
testAllEndpoints().catch(console.error);
