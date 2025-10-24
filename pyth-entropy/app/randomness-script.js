require('dotenv').config();
const { Web3 } = require("web3");
const RandomnessGenAbi = require("../out/RandomnessGen.sol/RandomPairNumericV2.json");
const EntropyAbi = require("@pythnetwork/entropy-sdk-solidity/abis/IEntropyV2.json");
 
async function main() {
  // Check if required environment variables are set
  const requiredEnvVars = ['RPC_URL', 'PRIVATE_KEY', 'RANDOMNESS_ADDRESS', 'ENTROPY_ADDRESS'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  
  const web3 = new Web3(process.env["RPC_URL"]);
  const { address } = web3.eth.accounts.wallet.add(
    process.env["PRIVATE_KEY"]
  )[0];
 
  web3.eth.defaultBlock = "finalized";
 
  const randomnessGenContract = new web3.eth.Contract(
    RandomnessGenAbi.abi,
    process.env["RANDOMNESS_ADDRESS"]
  );
 
  const entropyContract = new web3.eth.Contract(
    EntropyAbi,
    process.env["ENTROPY_ADDRESS"]
  );

  const fee = await entropyContract.methods.getFeeV2().call()
  console.log(`fee         : ${fee}`);
 
  const requestReceipt = await randomnessGenContract.methods
    .requestPair()
    .send({
      value: fee,
      from: address,
    });
 
  console.log(`request tx  : ${requestReceipt.transactionHash}`);
  // Read the sequence number for the request from the transaction events.
  const sequenceNumber =
  requestReceipt.events.Requested.returnValues.sequenceNumber;
  console.log(`sequence    : ${sequenceNumber}`);

  let fromBlock = requestReceipt.blockNumber;
  const intervalId = setInterval(async () => {
    const currentBlock = await web3.eth.getBlockNumber();
 
    if(fromBlock > currentBlock) {
      return;
    }
 
    // Get 'RandomPairGenerated' events emitted by the RandomnessGen contract for given block range.
    const events = await randomnessGenContract.getPastEvents("RandomPairGenerated", {
      fromBlock: fromBlock,
      toBlock: currentBlock,
    });
    fromBlock = currentBlock + 1n;
 
    // Find the event with the same sequence number as the request.
    const event = events.find(event => event.returnValues.sequenceNumber === sequenceNumber);
 
    // If the event is found, log the result and stop polling.
    if(event !== undefined) {
      const n1 = event.returnValues.n1;
      const n2 = event.returnValues.n2;
      
      console.log(`\n🎲 Random Numbers Generated!`);
      console.log(`===============================`);
      
      // Raw numbers
      console.log(`Raw Numbers:`);
      console.log(`Random Number 1 (n1): ${n1}`);
      console.log(`Random Number 2 (n2): ${n2}`);
      
      // Convert to different formats
      const n1Hex = '0x' + BigInt(n1).toString(16);
      const n2Hex = '0x' + BigInt(n2).toString(16);
      
      console.log(`\nHexadecimal Format:`);
      console.log(`n1: ${n1Hex}`);
      console.log(`n2: ${n2Hex}`);
      
      // Convert to 0-100 range
      const n1Percent = (BigInt(n1) % 101n).toString();
      const n2Percent = (BigInt(n2) % 101n).toString();
      
      console.log(`\nPercentage (0-100):`);
      console.log(`n1: ${n1Percent}%`);
      console.log(`n2: ${n2Percent}%`);
      
  
      // Convert to 1-100 range
      const n1Hundred = (BigInt(n1) % 100n) + 1n;
      const n2Hundred = (BigInt(n2) % 100n) + 1n;
      
      console.log(`\nRange 1-100:`);
      console.log(`n1: ${n1Hundred}`);
      console.log(`n2: ${n2Hundred}`);
      
      // Convert to 0-1 decimal
      const n1Decimal = Number(BigInt(n1) % 1000000n) / 1000000;
      const n2Decimal = Number(BigInt(n2) % 1000000n) / 1000000;
      
      console.log(`\nDecimal (0-1):`);
      console.log(`n1: ${n1Decimal}`);
      console.log(`n2: ${n2Decimal}`);
      
      console.log(`\nRequester: ${event.returnValues.requester}`);
      console.log(`===============================\n`);
      clearInterval(intervalId);
    }
 
  }, 1000);
  
}
 
main();
