import { OGNetworkClient } from './network-client.js';

async function test0GConnection() {
  console.log('🚀 Testing 0G Network Connection...\n');
  
  const client = new OGNetworkClient();
  
  try {
    // Test  connection
    const connected = await client.connect();
    
    if (connected) {
      console.log('✅ Successfully connected to 0G network!');
      
      // Test network info
      const networkInfo = await client.getNetworkInfo();
      console.log('📊 Network Info:', networkInfo);
      
      // Test balance query (using a known testnet address)
      const testAddress = '0x6975253db7f4ab6d66799440617a81a0b4fa5708';
      const balance = await client.getBalance(testAddress);
      console.log(`💰 Balance for ${testAddress}: ${balance} A0GI`);
      
    } else {
      console.log('❌ Failed to connect to 0G network');
    }
    
  } catch (error) {
    console.error('💥 Error during testing:', error);
  }
}

// Run the test
test0GConnection();
