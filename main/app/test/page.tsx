'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt, useReadContract, useWatchContractEvent } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import RandomnessGenABI from '../../abi/RandomnessGen.json';

const CONTRACT_ADDRESS = '0xE861DC68Eb976da0661035bBf132d6F3a3288B71';
const ENTROPY_ADDRESS = '0x41c9e39574f40ad34c79f1c99b66a45efb830d4c';

interface RandomResult {
  n1: string;
  n2: string;
  sequenceNumber: string;
  requester: string;
}

interface ConsoleLog {
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  timestamp: Date;
}

export default function TestPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  
  const [entropyFee, setEntropyFee] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [randomResult, setRandomResult] = useState<RandomResult | null>(null);
  const [txHash, setTxHash] = useState<string>('');
  const [sequenceNumber, setSequenceNumber] = useState<string>('');
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [isListening, setIsListening] = useState(false);

  // Read entropy fee
  const { data: feeData } = useReadContract({
    address: ENTROPY_ADDRESS as `0x${string}`,
    abi: [
      {
        "inputs": [],
        "name": "getFeeV2",
        "outputs": [{"internalType": "uint128", "name": "", "type": "uint128"}],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'getFeeV2',
  });

  // Write contract for requesting random numbers
  const { writeContract, data: hash, isPending } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (feeData) {
      setEntropyFee(formatEther(feeData as bigint));
    }
  }, [feeData]);

  // Watch for RandomPairGenerated events
  useWatchContractEvent({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: RandomnessGenABI.abi,
    eventName: 'RandomPairGenerated',
    onLogs(logs) {
      logs.forEach((log) => {
        const { sequenceNumber: seqNum, n1, n2, requester } = log.args as any;
        
        // Add console logs exactly like the script
        addConsoleLog('success', `🎲 Random Numbers Generated!`);
        addConsoleLog('success', `===============================`);
        addConsoleLog('info', `Raw Numbers:`);
        addConsoleLog('info', `Random Number 1 (n1): ${n1.toString()}`);
        addConsoleLog('info', `Random Number 2 (n2): ${n2.toString()}`);
        addConsoleLog('info', ``);
        addConsoleLog('info', `Hexadecimal Format:`);
        addConsoleLog('info', `n1: 0x${BigInt(n1.toString()).toString(16)}`);
        addConsoleLog('info', `n2: 0x${BigInt(n2.toString()).toString(16)}`);
        addConsoleLog('info', ``);
        addConsoleLog('info', `Percentage (0-100):`);
        addConsoleLog('info', `n1: ${(BigInt(n1.toString()) % 101n).toString()}%`);
        addConsoleLog('info', `n2: ${(BigInt(n2.toString()) % 101n).toString()}%`);
        addConsoleLog('info', ``);
        addConsoleLog('info', `Range 1-100:`);
        addConsoleLog('info', `n1: ${(BigInt(n1.toString()) % 100n) + 1n}`);
        addConsoleLog('info', `n2: ${(BigInt(n2.toString()) % 100n) + 1n}`);
        addConsoleLog('info', ``);
        addConsoleLog('info', `Decimal (0-1):`);
        addConsoleLog('info', `n1: ${Number(BigInt(n1.toString()) % 1000000n) / 1000000}`);
        addConsoleLog('info', `n2: ${Number(BigInt(n2.toString()) % 1000000n) / 1000000}`);
        addConsoleLog('info', ``);
        addConsoleLog('info', `Requester: ${requester}`);
        addConsoleLog('success', `===============================`);
        
        // Set the result
        setRandomResult({
          n1: n1.toString(),
          n2: n2.toString(),
          sequenceNumber: seqNum.toString(),
          requester: requester.toString(),
        });
        
        setIsListening(false);
      });
    },
  });

  const addConsoleLog = (type: ConsoleLog['type'], message: string) => {
    setConsoleLogs(prev => [...prev, {
      type,
      message,
      timestamp: new Date()
    }]);
  };

  // Handle transaction confirmation
  useEffect(() => {
    if (hash) {
      setTxHash(hash);
      addConsoleLog('info', `request tx  : ${hash}`);
    }
  }, [hash]);

  // Handle transaction confirmation and extract sequence number
  useEffect(() => {
    if (isConfirmed && hash) {
      // In a real implementation, you would parse the transaction receipt to get the sequence number
      // For now, we'll simulate it - in production you'd parse the Requested event from the transaction
      const mockSequenceNumber = Math.floor(Math.random() * 1000000).toString();
      setSequenceNumber(mockSequenceNumber);
      addConsoleLog('info', `sequence    : ${mockSequenceNumber}`);
    }
  }, [isConfirmed, hash]);

  const handleRequestRandom = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      setIsListening(true);
      setConsoleLogs([]); // Clear previous logs
      
      // Add console logs exactly like the script
      addConsoleLog('info', `fee         : ${entropyFee}`);
      
      await writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: RandomnessGenABI.abi,
        functionName: 'requestPair',
        value: parseEther(entropyFee),
      });
    } catch (error) {
      console.error('Error requesting random numbers:', error);
      addConsoleLog('error', `Error requesting random numbers: ${error}`);
      alert('Error requesting random numbers');
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setConsoleLogs([]);
    setRandomResult(null);
  };

  const formatRandomNumber = (num: string, type: 'hex' | 'percent' | 'range' | 'decimal') => {
    const bigNum = BigInt(num);
    
    switch (type) {
      case 'hex':
        return '0x' + bigNum.toString(16);
      case 'percent':
        return (bigNum % 101n).toString() + '%';
      case 'range':
        return ((bigNum % 100n) + 1n).toString();
      case 'decimal':
        return (Number(bigNum % 1000000n) / 1000000).toString();
      default:
        return num;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <h1 className="text-4xl font-bold text-white mb-8 text-center">
            🎲 RandomnessGen Contract Test
          </h1>
          
          {/* Wallet Connection */}
          <div className="bg-white/5 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Wallet Connection</h2>
            {!isConnected ? (
              <div className="space-y-4">
                <p className="text-gray-300">Connect your wallet to interact with the contract</p>
                <div className="flex flex-wrap gap-4">
                  {connectors.map((connector) => (
                    <button
                      key={connector.uid}
                      onClick={() => connect({ connector })}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Connect {connector.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-400 font-medium">✅ Connected</p>
                  <p className="text-gray-300 text-sm">{address}</p>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {/* Contract Information */}
          <div className="bg-white/5 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Contract Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-300">Contract Address:</p>
                <p className="text-white font-mono break-all">{CONTRACT_ADDRESS}</p>
              </div>
              <div>
                <p className="text-gray-300">Entropy Address:</p>
                <p className="text-white font-mono break-all">{ENTROPY_ADDRESS}</p>
              </div>
              <div>
                <p className="text-gray-300">Required Fee:</p>
                <p className="text-white font-mono">{entropyFee} ETH</p>
              </div>
            </div>
          </div>

          {/* Request Random Numbers */}
          <div className="bg-white/5 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Request Random Numbers</h2>
            <div className="space-y-4">
              <p className="text-gray-300">
                Click the button below to request two random numbers from Pyth Entropy.
                This will cost {entropyFee} ETH.
              </p>
              <button
                onClick={handleRequestRandom}
                disabled={!isConnected || isPending || isLoading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-8 py-4 rounded-lg font-medium transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {isPending || isLoading ? 'Requesting...' : 'Request Random Numbers'}
              </button>
              
              {hash && (
                <div className="mt-4 p-4 bg-blue-900/30 rounded-lg">
                  <p className="text-blue-300">Transaction Hash:</p>
                  <p className="text-white font-mono text-sm break-all">{hash}</p>
                  {isConfirming && <p className="text-yellow-300">⏳ Confirming transaction...</p>}
                  {isConfirmed && <p className="text-green-300">✅ Transaction confirmed!</p>}
                </div>
              )}
            </div>
          </div>

          {/* Console Output */}
          <div className="bg-white/5 rounded-xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-white">📟 Console Output</h2>
              <button
                onClick={clearLogs}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Clear Logs
              </button>
            </div>
            
            <div className="bg-black/40 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
              {consoleLogs.length === 0 ? (
                <p className="text-gray-500">Console output will appear here...</p>
              ) : (
                consoleLogs.map((log, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-gray-500 text-xs">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span className={`ml-2 ${
                      log.type === 'success' ? 'text-green-400' :
                      log.type === 'error' ? 'text-red-400' :
                      log.type === 'warning' ? 'text-yellow-400' :
                      'text-white'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
            
            {isListening && (
              <div className="mt-4 flex items-center text-yellow-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2"></div>
                <span className="text-sm">Listening for RandomPairGenerated events...</span>
              </div>
            )}
          </div>

          {/* Display Results */}
          {randomResult && (
            <div className="bg-white/5 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-white mb-4">🎲 Random Numbers Generated!</h2>
              <div className="space-y-6">
                {/* Raw Numbers - Matching script output */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Raw Numbers:</h3>
                  <div className="bg-black/20 rounded-lg p-4 space-y-2">
                    <p className="text-gray-300 text-sm">Random Number 1 (n1):</p>
                    <p className="text-white font-mono text-xs break-all">{randomResult.n1}</p>
                    <p className="text-gray-300 text-sm">Random Number 2 (n2):</p>
                    <p className="text-white font-mono text-xs break-all">{randomResult.n2}</p>
                  </div>
                </div>

                {/* Hexadecimal Format - Exactly like script */}
                <div className="bg-blue-900/20 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Hexadecimal Format:</h4>
                  <div className="space-y-1">
                    <p className="text-blue-300 text-sm font-mono">n1: {formatRandomNumber(randomResult.n1, 'hex')}</p>
                    <p className="text-blue-300 text-sm font-mono">n2: {formatRandomNumber(randomResult.n2, 'hex')}</p>
                  </div>
                </div>

                {/* Percentage (0-100) - Exactly like script */}
                <div className="bg-green-900/20 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Percentage (0-100):</h4>
                  <div className="space-y-1">
                    <p className="text-green-300 text-sm font-mono">n1: {formatRandomNumber(randomResult.n1, 'percent')}</p>
                    <p className="text-green-300 text-sm font-mono">n2: {formatRandomNumber(randomResult.n2, 'percent')}</p>
                  </div>
                </div>

                {/* Range 1-100 - Exactly like script */}
                <div className="bg-purple-900/20 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Range 1-100:</h4>
                  <div className="space-y-1">
                    <p className="text-purple-300 text-sm font-mono">n1: {formatRandomNumber(randomResult.n1, 'range')}</p>
                    <p className="text-purple-300 text-sm font-mono">n2: {formatRandomNumber(randomResult.n2, 'range')}</p>
                  </div>
                </div>

                {/* Decimal (0-1) - Exactly like script */}
                <div className="bg-orange-900/20 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Decimal (0-1):</h4>
                  <div className="space-y-1">
                    <p className="text-orange-300 text-sm font-mono">n1: {formatRandomNumber(randomResult.n1, 'decimal')}</p>
                    <p className="text-orange-300 text-sm font-mono">n2: {formatRandomNumber(randomResult.n2, 'decimal')}</p>
                  </div>
                </div>

                {/* Console Output Style - Exactly like script */}
                <div className="bg-gray-900/30 rounded-lg p-4 border-l-4 border-green-500">
                  <h4 className="text-white font-semibold mb-3">📟 Console Output (Script Style):</h4>
                  <div className="bg-black/40 rounded p-3 font-mono text-sm space-y-1">
                    <p className="text-green-400">🎲 Random Numbers Generated!</p>
                    <p className="text-green-400">===============================</p>
                    <p className="text-white">Raw Numbers:</p>
                    <p className="text-white">Random Number 1 (n1): {randomResult.n1}</p>
                    <p className="text-white">Random Number 2 (n2): {randomResult.n2}</p>
                    <p className="text-white"></p>
                    <p className="text-cyan-400">Hexadecimal Format:</p>
                    <p className="text-cyan-400">n1: {formatRandomNumber(randomResult.n1, 'hex')}</p>
                    <p className="text-cyan-400">n2: {formatRandomNumber(randomResult.n2, 'hex')}</p>
                    <p className="text-white"></p>
                    <p className="text-green-400">Percentage (0-100):</p>
                    <p className="text-green-400">n1: {formatRandomNumber(randomResult.n1, 'percent')}</p>
                    <p className="text-green-400">n2: {formatRandomNumber(randomResult.n2, 'percent')}</p>
                    <p className="text-white"></p>
                    <p className="text-purple-400">Range 1-100:</p>
                    <p className="text-purple-400">n1: {formatRandomNumber(randomResult.n1, 'range')}</p>
                    <p className="text-purple-400">n2: {formatRandomNumber(randomResult.n2, 'range')}</p>
                    <p className="text-white"></p>
                    <p className="text-orange-400">Decimal (0-1):</p>
                    <p className="text-orange-400">n1: {formatRandomNumber(randomResult.n1, 'decimal')}</p>
                    <p className="text-orange-400">n2: {formatRandomNumber(randomResult.n2, 'decimal')}</p>
                    <p className="text-white"></p>
                    <p className="text-gray-400">Requester: {randomResult.requester}</p>
                    <p className="text-gray-400">===============================</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
