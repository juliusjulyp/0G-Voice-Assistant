// Simple network connectivity test without TypeScript
const https = require('https');

async function testNetworkConnectivity() {
  console.log('🔍 Testing Network Connectivity...\n');
  
  const endpoints = [
    'https://evmrpc-testnet.0g.ai',
    'https://chainscan-galileo.0g.ai',
    'https://faucet.0g.ai',
    'https://indexer-storage-testnet-turbo.0g.ai'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      
      await new Promise((resolve, reject) => {
        const req = https.get(endpoint, (res) => {
          console.log(`✅ ${endpoint} - Status: ${res.statusCode}`);
          resolve();
        });
        
        req.on('error', (error) => {
          console.log(`❌ ${endpoint} - Error: ${error.message}`);
          resolve(); // Continue testing other endpoints
        });
        
        req.setTimeout(10000, () => {
          req.destroy();
          console.log(`⏰ ${endpoint} - Timeout`);
          resolve();
        });
      });
      
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }
}

// Test basic internet connectivity
console.log('🌐 Testing basic internet connectivity...');
testNetworkConnectivity();
