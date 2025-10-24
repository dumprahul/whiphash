// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

/// @title RandomPairNumericV2
/// @notice Requests randomness from Pyth Entropy V2 and derives two independent uint256 values (n1, n2).
contract RandomPairNumericV2 is IEntropyConsumer {
    IEntropyV2 public immutable entropy;

    struct Request {
        address requester;
        address provider;
        bytes32 userContribution;
        uint32 customGasLimit;
    }

    struct Result {
        uint256 n1;
        uint256 n2;
        bool fulfilled;
        address requester;
    }

    mapping(uint64 => Request) public requests;
    mapping(uint64 => Result) public results;

    event Requested(uint64 indexed sequenceNumber, address indexed requester);
    event RandomPairGenerated(uint64 indexed sequenceNumber, uint256 n1, uint256 n2, address indexed requester);

    constructor(address _entropy) {
        require(_entropy != address(0), "entropy zero");
        entropy = IEntropyV2(_entropy);
    }

    /// @dev Required by IEntropyConsumer — returns the entropy contract address
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    /* ===================== Request functions ===================== */

    function requestPair() external payable {
        uint128 fee = entropy.getFeeV2();
        require(msg.value >= fee, "insufficient fee");

        uint64 sequenceNumber = entropy.requestV2{ value: fee }();

        requests[sequenceNumber] = Request({
            requester: msg.sender,
            provider: address(0),
            userContribution: bytes32(0),
            customGasLimit: 0
        });

        _refundOverpay(msg.value, fee);
        emit Requested(sequenceNumber, msg.sender);
    }

    function requestPairWithGas(uint32 customGasLimit) external payable {
        uint128 fee = entropy.getFeeV2(customGasLimit);
        require(msg.value >= fee, "insufficient fee");

        uint64 sequenceNumber = entropy.requestV2{ value: fee }(customGasLimit);

        requests[sequenceNumber] = Request({
            requester: msg.sender,
            provider: address(0),
            userContribution: bytes32(0),
            customGasLimit: customGasLimit
        });

        _refundOverpay(msg.value, fee);
        emit Requested(sequenceNumber, msg.sender);
    }

    function requestPairWithProvider(address provider, uint32 customGasLimit) external payable {
        require(provider != address(0), "zero provider");
        uint128 fee = entropy.getFeeV2(customGasLimit);
        require(msg.value >= fee, "insufficient fee");

        uint64 sequenceNumber = entropy.requestV2{ value: fee }(provider, customGasLimit);

        requests[sequenceNumber] = Request({
            requester: msg.sender,
            provider: provider,
            userContribution: bytes32(0),
            customGasLimit: customGasLimit
        });

        _refundOverpay(msg.value, fee);
        emit Requested(sequenceNumber, msg.sender);
    }

    function requestPairWithUserRandom(
        address provider,
        bytes32 userRandomNumber,
        uint32 customGasLimit
    ) external payable {
        require(provider != address(0), "zero provider");
        uint128 fee = entropy.getFeeV2(customGasLimit);
        require(msg.value >= fee, "insufficient fee");

        uint64 sequenceNumber = entropy.requestV2{ value: fee }(provider, userRandomNumber, customGasLimit);

        requests[sequenceNumber] = Request({
            requester: msg.sender,
            provider: provider,
            userContribution: userRandomNumber,
            customGasLimit: customGasLimit
        });

        _refundOverpay(msg.value, fee);
        emit Requested(sequenceNumber, msg.sender);
    }

    /* ===================== entropyCallback ===================== */

    /// @dev Called by the Entropy contract when randomness is ready
    function entropyCallback(
        uint64 sequenceNumber,
        address _providerAddress,
        bytes32 randomNumber
    ) internal override {
        Request memory req = requests[sequenceNumber];
        require(req.requester != address(0), "unknown request");

        // domain-separated derived bytes
        bytes32 b1 = keccak256(abi.encodePacked(randomNumber, "r1"));
        bytes32 b2 = keccak256(abi.encodePacked(randomNumber, "r2"));

        uint256 n1 = uint256(b1);
        uint256 n2 = uint256(b2);

        results[sequenceNumber] = Result({
            n1: n1,
            n2: n2,
            fulfilled: true,
            requester: req.requester
        });

        emit RandomPairGenerated(sequenceNumber, n1, n2, req.requester);

        // cleanup to free storage
        delete requests[sequenceNumber];
    }

    /* ===================== View / helpers ===================== */

    function getResult(uint64 sequenceNumber) external view returns (uint256 n1, uint256 n2, bool fulfilled, address requester) {
        Result memory r = results[sequenceNumber];
        return (r.n1, r.n2, r.fulfilled, r.requester);
    }

    function deriveFromSeed(bytes32 seed) external pure returns (uint256, uint256) {
        bytes32 b1 = keccak256(abi.encodePacked(seed, "r1"));
        bytes32 b2 = keccak256(abi.encodePacked(seed, "r2"));
        return (uint256(b1), uint256(b2));
    }

    /* ===================== Internal utils ===================== */

    function _refundOverpay(uint256 paid, uint128 fee) internal {
        uint256 over = paid - uint256(fee);
        if (over > 0) {
            (bool ok, ) = payable(msg.sender).call{ value: over }("");
            if (!ok) {
                // optional: emit event for failed refund
            }
        }
    }
}
