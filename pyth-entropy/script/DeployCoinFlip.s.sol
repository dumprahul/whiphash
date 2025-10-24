// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/CoinFlip.sol";

contract DeployCoinFlip is Script {
    function run() external {
        // Get the private key from environment variable
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the CoinFlip contract
        // You need to provide the Pyth Entropy contract address for your target network
        address entropyAddress = getEntropyAddress();
        
        CoinFlip coinFlip = new CoinFlip(entropyAddress);
        
        console.log("CoinFlip deployed at:", address(coinFlip));
        console.log("Entropy address:", entropyAddress);
        
        vm.stopBroadcast();
    }
    
    function getEntropyAddress() internal view returns (address) {
        // Get entropy address from environment variable
        return vm.envAddress("ENTROPY_ADDRESS");
    }
}
