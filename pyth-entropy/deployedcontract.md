(base) admin@192 pyth-entropy % forge script script/DeployRandomnessGen.s.sol:DeployRandomnessGen --rpc-url https://sepolia.base.org --broadcast --verify
[⠊] Compiling...
[⠑] Compiling 1 files with Solc 0.8.30
[⠘] Solc 0.8.30 finished in 583.17ms
Compiler run successful with warnings:
Warning (5667): Unused function parameter. Remove or comment out the variable name to silence this warning.
   --> src/RandomnessGen.sol:123:9:
    |
123 |         address _providerAddress,
    |         ^^^^^^^^^^^^^^^^^^^^^^^^

Script ran successfully.

== Logs ==
  RandomnessGen deployed at: 0xE861DC68Eb976da0661035bBf132d6F3a3288B71
  Entropy address: 0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c

## Setting up 1 EVM.

==========================

Chain 84532

Estimated gas price: 0.001000162 gwei

Estimated total gas used for script: 2415254

Estimated amount required: 0.000002415645271148 ETH

==========================

##### base-sepolia
✅  [Success] Hash: 0x39a943edca709c3337e2b01e6b58cf9db16af0b6403acb48448f7094b9354bb1
Contract Address: 0xE861DC68Eb976da0661035bBf132d6F3a3288B71
Block: 32774035
Paid: 0.000001858038488928 ETH (1857888 gas * 0.001000081 gwei)

✅ Sequence #1 on base-sepolia | Total Paid: 0.000001858038488928 ETH (1857888 gas * avg 0.001000081 gwei)
                                                                                                

==========================

ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.
##
Start verification for (1) contracts
Start verifying contract `0xE861DC68Eb976da0661035bBf132d6F3a3288B71` deployed on base-sepolia
EVM version: prague
Compiler version: 0.8.30
Constructor args: 00000000000000000000000041c9e39574f40ad34c79f1c99b66a45efb830d4c
Attempting to verify on Sourcify. Pass the --etherscan-api-key <API_KEY> to verify on Etherscan, or use the --verifier flag to verify on another provider.

Submitting verification for [RandomPairNumericV2] "0xE861DC68Eb976da0661035bBf132d6F3a3288B71".
Contract successfully verified
All (1) contracts were verified!

Transactions saved to: /Users/admin/Downloads/projects/whiphash/pyth-entropy/broadcast/DeployRandomnessGen.s.sol/84532/run-latest.json

Sensitive values saved to: /Users/admin/Downloads/projects/whiphash/pyth-entropy/cache/DeployRandomnessGen.s.sol/84532/run-latest.json
