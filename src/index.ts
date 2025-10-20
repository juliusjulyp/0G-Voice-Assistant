import { OGNetworkClient } from './network-client.js';
import { OG_CONFIG } from './config.js';

async function main() {
  console.log('🚀 Starting 0G Voice Assistant...');
  console.log('Network:', OG_CONFIG.networkName);
  console.log('Chain ID:', OG_CONFIG.chainId);
  
  const client = new OGNetworkClient();
  
  try {
    console.log('\n🔗 Connecting to 0G network...');
    const connected = await client.connect();
    
    if (connected) {
      console.log('✅ Successfully connected to 0G network!');
      
      // Test network info
      const networkInfo = await client.getNetworkInfo();
      console.log('\n📊 Network Information:');
      console.log('  Block Number:', networkInfo.blockNumber);
      console.log('  Gas Price:', networkInfo.gasPrice);
      console.log('  Network:', networkInfo.network);
      console.log('  Chain ID:', networkInfo.chainId);
      
    } else {
      console.log('❌ Failed to connect to 0G network');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);