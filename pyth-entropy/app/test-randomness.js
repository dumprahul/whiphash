require('dotenv').config();
const { Web3 } = require("web3");

async function testSetup() {
  console.log("🔍 Testing RandomnessGen setup...");
  
  // Check environment variables
  const requiredEnvVars = ['RPC_URL', 'PRIVATE_KEY', 'RANDOMNESS_ADDRESS', 'ENTROPY_ADDRESS'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    return;
  }
  
  console.log("✅ All environment variables are set");
  
  // Test Web3 connection
  try {
    const web3 = new Web3(process.env["RPC_URL"]);
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`✅ Connected to network. Current block: ${blockNumber}`);
  } catch (error) {
    console.error("❌ Failed to connect to network:", error.message);
    return;
  }
  
  // Test contract address
  try {
    const web3 = new Web3(process.env["RPC_URL"]);
    const code = await web3.eth.getCode(process.env["RANDOMNESS_ADDRESS"]);
    if (code === '0x') {
      console.error("❌ No contract found at RANDOMNESS_ADDRESS");
      return;
    }
    console.log("✅ Contract found at RANDOMNESS_ADDRESS");
  } catch (error) {
    console.error("❌ Failed to check contract:", error.message);
    return;
  }
  
  console.log("🎉 Setup looks good! You can now run: npm run randomness");
}

testSetup();
