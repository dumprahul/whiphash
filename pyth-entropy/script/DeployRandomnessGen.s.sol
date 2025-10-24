// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/RandomnessGen.sol";

contract DeployRandomnessGen is Script {
    function run() external {
        // Get the private key from environment variable
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the RandomnessGen contract
        // Get entropy address from environment variable
        address entropyAddress = vm.envAddress("ENTROPY_ADDRESS");
        
        RandomPairNumericV2 randomnessGen = new RandomPairNumericV2(entropyAddress);
        
        console.log("RandomnessGen deployed at:", address(randomnessGen));
        console.log("Entropy address:", entropyAddress);
        
        vm.stopBroadcast();
    }
}
