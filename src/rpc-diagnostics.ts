import https from 'https';
import http from 'http';
import { OG_CONFIG } from './config.js';

interface RPCEndpointTest {
  url: string;
  status: 'success' | 'failed' | 'timeout';
  responseTime: number;
  error?: string;
  chainId?: string;
  blockNumber?: number;
}

const RPC_ENDPOINTS = [
  'https://evmrpc-testnet.0g.ai', // Primary RPC endpoint
  'https://chainscan-galileo.0g.ai', // Explorer endpoint
  'https://faucet.0g.ai', // Faucet endpoint
  'https://indexer-storage-testnet-turbo.0g.ai' // Storage endpoint
];

async function testRPCEndpoint(url: string, timeout: number = 10000): Promise<RPCEndpointTest> {
  const startTime = Date.now();
  
  const postData = JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_chainId',
    params: [],
    id: 1
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: timeout
  };

  return new Promise((resolve) => {
    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        
        try {
          const response = JSON.parse(data);
          
          if (response.result) {
            const chainId = parseInt(response.result, 16);
            resolve({
              url,
              status: 'success',
              responseTime,
              chainId: chainId.toString(),
              error: undefined
            });
          } else {
            resolve({
              url,
              status: 'failed',
              responseTime,
              error: `Invalid response: ${data}`
            });
          }
        } catch (error) {
          resolve({
            url,
            status: 'failed',
            responseTime,
            error: `JSON parse error: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      resolve({
        url,
        status: 'failed',
        responseTime,
        error: `Request error: ${error.message}`
      });
    });

    req.on('timeout', () => {
      const responseTime = Date.now() - startTime;
      req.destroy();
      resolve({
        url,
        status: 'timeout',
        responseTime,
        error: 'Request timeout after 10 seconds'
      });
    });

    req.write(postData);
    req.end();
  });
}

async function testBasicConnectivity(url: string): Promise<{status: number, error?: string}> {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      resolve({ status: res.statusCode || 0 });
    });

    req.on('error', (error) => {
      resolve({ status: 0, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, error: 'Timeout' });
    });

    req.setTimeout(5000);
  });
}

async function runDiagnostics() {
  console.log('🔍 0G Network RPC Diagnostics Tool');
  console.log('=====================================\n');
  console.log(`Testing ${RPC_ENDPOINTS.length} endpoints...\n`);

  const results: RPCEndpointTest[] = [];

  for (const endpoint of RPC_ENDPOINTS) {
    console.log(`📡 Testing: ${endpoint}`);
    
    // Test basic connectivity first
    console.log('  └─ Basic connectivity test...');
    const basicTest = await testBasicConnectivity(endpoint);
    
    if (basicTest.status === 0) {
      console.log(`  ❌ Basic connectivity failed: ${basicTest.error}`);
      results.push({
        url: endpoint,
        status: 'failed',
        responseTime: 0,
        error: `Basic connectivity failed: ${basicTest.error}`
      });
      continue;
    }
    
    console.log(`  ✅ Basic connectivity: HTTP ${basicTest.status}`);

    // Test RPC functionality
    console.log('  └─ RPC functionality test...');
    const rpcTest = await testRPCEndpoint(endpoint);
    results.push(rpcTest);

    if (rpcTest.status === 'success') {
      console.log(`  ✅ RPC test passed (${rpcTest.responseTime}ms)`);
      console.log(`  📊 Chain ID: ${rpcTest.chainId}`);
    } else {
      console.log(`  ❌ RPC test failed: ${rpcTest.error} (${rpcTest.responseTime}ms)`);
    }
    
    console.log('');
  }

  // Generate summary report
  console.log('\n📋 DIAGNOSTICS REPORT');
  console.log('=====================\n');

  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  const timeouts = results.filter(r => r.status === 'timeout');

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  console.log(`⏰ Timeouts: ${timeouts.length}/${results.length}`);

  if (successful.length > 0) {
    console.log('\n🎯 WORKING ENDPOINTS:');
    successful.forEach(endpoint => {
      console.log(`  ✅ ${endpoint.url} (${endpoint.responseTime}ms)`);
    });
  }

  if (failed.length > 0) {
    console.log('\n💥 FAILED ENDPOINTS:');
    failed.forEach(endpoint => {
      console.log(`  ❌ ${endpoint.url}`);
      console.log(`     Error: ${endpoint.error}`);
    });
  }

  if (timeouts.length > 0) {
    console.log('\n⏰ TIMEOUT ENDPOINTS:');
    timeouts.forEach(endpoint => {
      console.log(`  ⏰ ${endpoint.url} (no response in 10s)`);
    });
  }

  // Network health analysis
  console.log('\n🔬 NETWORK HEALTH ANALYSIS:');
  
  if (successful.length === 0) {
    console.log('🚨 CRITICAL: No working RPC endpoints found!');
    console.log('💡 RECOMMENDATIONS:');
    console.log('   1. Check your internet connection');
    console.log('   2. Verify 0G testnet status at https://chainscan-galileo.0g.ai');
    console.log('   3. Try using a VPN (some regions may block access)');
    console.log('   4. Consider using alternative RPC providers');
    console.log('   5. Check 0G Discord/Twitter for network status updates');
  } else if (successful.length < RPC_ENDPOINTS.length / 2) {
    console.log('⚠️  WARNING: Network is experiencing partial outages');
    console.log('💡 Use these working endpoints:');
    successful.forEach(endpoint => {
      console.log(`   - ${endpoint.url}`);
    });
  } else {
    console.log('✅ Network appears to be healthy');
    console.log('💡 Recommended primary endpoint:');
    console.log(`   - ${successful[0].url} (fastest: ${successful[0].responseTime}ms)`);
  }

  // Alternative solutions
  console.log('\n🔄 ALTERNATIVE SOLUTIONS:');
  console.log('1. Use a third-party RPC provider:');
  console.log('   - QuickNode: https://www.quicknode.com/chains/0g');
  console.log('   - Alchemy: https://www.alchemy.com/');
  console.log('   - ThirdWeb: https://thirdweb.com/0g');
  console.log('2. Run your own 0G node: https://docs.0g.ai/run-a-node');
  console.log('3. Use the official 0G explorer for readonly operations');

  return results;
}

// Run diagnostics if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDiagnostics().then(results => {
    console.log('\n✅ Diagnostics complete!');
    process.exit(results.some(r => r.status === 'success') ? 0 : 1);
  }).catch(error => {
    console.error('❌ Diagnostics failed:', error);
    process.exit(1);
  });
}

export { runDiagnostics, RPC_ENDPOINTS };
