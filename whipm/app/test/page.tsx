'use client'

import React, { useState, useEffect } from 'react'
import { createPublicClient, http, parseAbi, parseEventLogs } from 'viem'
import { baseSepolia } from 'viem/chains'

interface PasswordGenerationResult {
  password: string
  metadata: {
    txHash: string
    sequenceNumber: string
    deviceSecret: string
    r1: string
    r2: string
    localRaw: string
    localKey: string
    seedRaw: string
    passwordBytes: string
    salt1: string
    passwordSalt: string
    argon2Params: {
      memory: number
      time: number
      parallelism: number
    }
  }
}

// Type for window.ethereum
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

const RANDOMNESS_CONTRACT = '0xE861DC68Eb976da0661035bBf132d6F3a3288B71'
const ENTROPY_CONTRACT = '0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c'

// Contract ABIs
const RANDOMNESS_ABI = parseAbi([
  'function requestPair() external payable',
  'function getResult(uint64 sequenceNumber) external view returns (uint256 n1, uint256 n2, bool fulfilled, address requester)',
  'event Requested(uint64 indexed sequenceNumber, address indexed requester)',
  'event RandomPairGenerated(uint64 indexed sequenceNumber, uint256 n1, uint256 n2, address indexed requester)'
])

const ENTROPY_ABI = parseAbi([
  'function getFeeV2() external view returns (uint128)'
])

export default function TestPage() {
  const [fee, setFee] = useState<string>('0')
  const [isRequesting, setIsRequesting] = useState(false)
  const [sequenceNumber, setSequenceNumber] = useState<string | null>(null)
  const [result, setResult] = useState<{
    n1: string
    n2: string
    fulfilled: boolean
    requester: string
  } | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [publicClient, setPublicClient] = useState<any>(null)
  const [passwordResult, setPasswordResult] = useState<PasswordGenerationResult | null>(null)
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false)

  // Initialize Viem client
  useEffect(() => {
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http('https://sepolia.base.org')
    })
    
    setPublicClient(client)
    
    // Get fee when client is ready
    getFee(client)
  }, [])

  // Check for wallet connection
  useEffect(() => {
    const checkWallet = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ethereum = (window as any).ethereum as EthereumProvider
          const accounts = await ethereum.request({ method: 'eth_accounts' }) as string[]
          if (accounts.length > 0) {
            setAccount(accounts[0])
          }
        } catch (err) {
          console.error('Error checking wallet:', err)
        }
      }
    }
    
    checkWallet()
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getFee = async (client: any) => {
    try {
      const feeValue = await client.readContract({
        address: ENTROPY_CONTRACT as `0x${string}`,
        abi: ENTROPY_ABI,
        functionName: 'getFeeV2'
      })
      
      setFee(feeValue.toString())
    } catch (err) {
      console.error('Error getting fee:', err)
      setError('Failed to get fee')
    }
  }

  const connectWallet = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ethereum = (window as any).ethereum as EthereumProvider
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as string[]
        if (accounts.length > 0) {
          setAccount(accounts[0])
        }
      } catch (err) {
        console.error('Error connecting wallet:', err)
        setError('Failed to connect wallet')
      }
    } else {
      setError('No wallet found. Please install MetaMask or similar wallet.')
    }
  }

  const requestRandomness = async () => {
    if (!account || !publicClient) {
      setError('No wallet connected or client not ready')
      return
    }

    setIsRequesting(true)
    setError(null)
    setResult(null)
    setSequenceNumber(null)
    setTxHash(null)

    try {
      // Send transaction using window.ethereum directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ethereum = (window as any).ethereum as EthereumProvider
      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: RANDOMNESS_CONTRACT,
          value: '0x' + BigInt(fee).toString(16),
          data: '0x4b3813e6' // requestPair() function selector
        }]
      }) as string

      console.log('Transaction sent:', txHash)
      setTxHash(txHash)

      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      
      // Parse events from receipt
      const requestEvents = parseEventLogs({
        abi: RANDOMNESS_ABI,
        logs: receipt.logs,
        eventName: 'Requested'
      })

      if (requestEvents.length > 0) {
        const seqNum = requestEvents[0].args.sequenceNumber.toString()
        setSequenceNumber(seqNum)
        startPolling(seqNum)
      } else {
        setError('Could not find sequence number in transaction')
      }

    } catch (err) {
      console.error('Error requesting randomness:', err)
      setError('Failed to request randomness')
    } finally {
      setIsRequesting(false)
    }
  }

  const startPolling = (seqNum: string) => {
    setIsPolling(true)
    
    const pollInterval = setInterval(async () => {
      try {
        if (!publicClient) return
        
        const result = await publicClient.readContract({
          address: RANDOMNESS_CONTRACT as `0x${string}`,
          abi: RANDOMNESS_ABI,
          functionName: 'getResult',
          args: [BigInt(seqNum)]
        })
        
        if (result[2]) { // result[2] is the fulfilled boolean
          const randomnessResult = {
            n1: result[0].toString(), // result[0] is n1
            n2: result[1].toString(), // result[1] is n2
            fulfilled: result[2],     // result[2] is fulfilled
            requester: result[3]     // result[3] is requester
          }
          setResult(randomnessResult)
          setIsPolling(false)
          clearInterval(pollInterval)
          
          // Generate password after getting randomness
          generatePassword(randomnessResult)
        }
      } catch (err) {
        console.error('Error polling result:', err)
      }
    }, 2000) // Poll every 2 seconds
  }

  const generatePassword = async (randomnessResult: {
    n1: string
    n2: string
    fulfilled: boolean
    requester: string
  }) => {
    if (!txHash || !sequenceNumber) {
      console.error('Missing transaction hash or sequence number')
      return
    }

    setIsGeneratingPassword(true)
    setPasswordResult(null)

    try {
      console.log('🔐 Starting password generation with Pyth randomness...')
      
      const pythRandomness = {
        n1: randomnessResult.n1,
        n2: randomnessResult.n2,
        txHash: txHash,
        sequenceNumber: sequenceNumber
      }

      // Call the API route for password generation
      const response = await fetch('/api/generate-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pythRandomness)
      })

      if (!response.ok) {
        throw new Error('Failed to generate password')
      }

      const passwordResult = await response.json()
      setPasswordResult(passwordResult)
      
      console.log('✅ Password generation completed!')
    } catch (err) {
      console.error('Error generating password:', err)
      setError('Failed to generate password')
    } finally {
      setIsGeneratingPassword(false)
    }
  }

  const formatNumber = (num: string, format: string) => {
    const bigNum = BigInt(num)
    
    switch (format) {
      case 'hex':
        return '0x' + bigNum.toString(16)
      case 'percentage':
        return (bigNum % BigInt(101)).toString() + '%'
      case 'range100':
        return ((bigNum % BigInt(100)) + BigInt(1)).toString()
      case 'decimal':
        return (Number(bigNum % BigInt(1000000)) / 1000000).toFixed(6)
      default:
        return num
    }
  }

  if (!publicClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-black">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-6 text-center text-black">🎲 Randomness Test</h1>
          
          {/* Contract Info */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2 text-black">Contract Information</h2>
            <p className="text-sm text-black">
              <strong>Randomness Contract:</strong> {RANDOMNESS_CONTRACT}
            </p>
            <p className="text-sm text-black">
              <strong>Entropy Provider:</strong> {ENTROPY_CONTRACT}
            </p>
            <p className="text-sm text-black">
              <strong>Fee (wei):</strong> {fee}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Real contract interaction using Viem library
            </p>
          </div>

          {/* Wallet Connection */}
          {!account && (
            <div className="mb-6">
              <button
                onClick={connectWallet}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Connect Wallet
              </button>
            </div>
          )}

          {/* Request Section */}
          {account && (
            <div className="mb-6">
              <button
                onClick={requestRandomness}
                disabled={isRequesting || isPolling || isGeneratingPassword}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isRequesting ? 'Requesting Randomness...' : 
                 isPolling ? 'Waiting for Randomness...' : 
                 isGeneratingPassword ? 'Generating Password...' : 
                 'Generate Secure Password'}
              </button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Transaction Hash */}
          {txHash && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800">Transaction Submitted</h3>
              <p className="text-yellow-700">Transaction Hash: {txHash}</p>
              {sequenceNumber && (
                <p className="text-yellow-700">Sequence Number: {sequenceNumber}</p>
              )}
              <p className="text-sm text-yellow-600">Waiting for randomness generation...</p>
            </div>
          )}

          {/* Randomness Results */}
          {result && (
            <div className="space-y-6">
              <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-xl font-semibold text-green-800 mb-4">🎲 Pyth Randomness Generated!</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Raw Numbers */}
                  <div>
                    <h4 className="font-semibold text-black mb-2">Raw Numbers</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-black"><strong>n1:</strong> {result.n1}</p>
                      <p className="text-sm text-black"><strong>n2:</strong> {result.n2}</p>
                    </div>
                  </div>

                  {/* Hexadecimal */}
                  <div>
                    <h4 className="font-semibold text-black mb-2">Hexadecimal</h4>
                    <div className="space-y-2">
                      <p className="text-sm font-mono text-black"><strong>n1:</strong> {formatNumber(result.n1, 'hex')}</p>
                      <p className="text-sm font-mono text-black"><strong>n2:</strong> {formatNumber(result.n2, 'hex')}</p>
                    </div>
                  </div>

                  {/* Percentage */}
                  <div>
                    <h4 className="font-semibold text-black mb-2">Percentage (0-100)</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-black"><strong>n1:</strong> {formatNumber(result.n1, 'percentage')}</p>
                      <p className="text-sm text-black"><strong>n2:</strong> {formatNumber(result.n2, 'percentage')}</p>
                    </div>
                  </div>

                  {/* Range 1-100 */}
                  <div>
                    <h4 className="font-semibold text-black mb-2">Range (1-100)</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-black"><strong>n1:</strong> {formatNumber(result.n1, 'range100')}</p>
                      <p className="text-sm text-black"><strong>n2:</strong> {formatNumber(result.n2, 'range100')}</p>
                    </div>
                  </div>

                  {/* Decimal */}
                  <div>
                    <h4 className="font-semibold text-black mb-2">Decimal (0-1)</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-black"><strong>n1:</strong> {formatNumber(result.n1, 'decimal')}</p>
                      <p className="text-sm text-black"><strong>n2:</strong> {formatNumber(result.n2, 'decimal')}</p>
                    </div>
                  </div>

                  {/* Requester */}
                  <div>
                    <h4 className="font-semibold text-black mb-2">Requester</h4>
                    <p className="text-sm font-mono text-black">{result.requester}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Password Generation Status */}
          {isGeneratingPassword && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">🔐 Generating Secure Password...</h3>
              <p className="text-yellow-700">Processing Pyth randomness through cryptographic functions...</p>
              <div className="mt-2 text-sm text-black">
                <p>• Generating device secret</p>
                <p>• Extracting randomness (R1, R2)</p>
                <p>• Applying HKDF and Argon2id</p>
                <p>• Creating final password</p>
              </div>
            </div>
          )}

          {/* Password Results */}
          {passwordResult && (
            <div className="space-y-6">
              <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="text-xl font-semibold text-purple-800 mb-4">🔐 Secure Password Generated!</h3>
                
                {/* Generated Password */}
                <div className="mb-6">
                  <h4 className="font-semibold text-black mb-2">Generated Password</h4>
                  <div className="bg-gray-100 p-3 rounded border">
                    <code className="text-lg font-mono break-all text-black">{passwordResult.password}</code>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(passwordResult.password)}
                    className="mt-2 px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                  >
                    Copy Password
                  </button>
                </div>

                {/* Cryptographic Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-black mb-2">Transaction Info</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-black"><strong>TX Hash:</strong> <code className="font-mono text-black">{passwordResult.metadata.txHash}</code></p>
                      <p className="text-black"><strong>Sequence:</strong> <code className="font-mono text-black">{passwordResult.metadata.sequenceNumber}</code></p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-black mb-2">Pyth Randomness</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-black"><strong>R1:</strong> <code className="font-mono text-black">{passwordResult.metadata.r1}</code></p>
                      <p className="text-black"><strong>R2:</strong> <code className="font-mono text-black">{passwordResult.metadata.r2}</code></p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-black mb-2">Device Secret</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-black"><strong>C:</strong> <code className="font-mono text-xs break-all text-black">{passwordResult.metadata.deviceSecret}</code></p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-black mb-2">Local Processing</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-black"><strong>local_raw:</strong> <code className="font-mono text-xs break-all text-black">{passwordResult.metadata.localRaw}</code></p>
                      <p className="text-black"><strong>LocalKey:</strong> <code className="font-mono text-xs break-all text-black">{passwordResult.metadata.localKey}</code></p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-black mb-2">Final Processing</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-black"><strong>seed_raw:</strong> <code className="font-mono text-xs break-all text-black">{passwordResult.metadata.seedRaw}</code></p>
                      <p className="text-black"><strong>Password bytes:</strong> <code className="font-mono text-xs break-all text-black">{passwordResult.metadata.passwordBytes}</code></p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-black mb-2">Argon2 Parameters</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-black"><strong>Memory:</strong> {passwordResult.metadata.argon2Params.memory} bytes</p>
                      <p className="text-black"><strong>Time:</strong> {passwordResult.metadata.argon2Params.time}</p>
                      <p className="text-black"><strong>Parallelism:</strong> {passwordResult.metadata.argon2Params.parallelism}</p>
                      <p className="text-black"><strong>Salt1:</strong> <code className="font-mono text-xs break-all text-black">{passwordResult.metadata.salt1}</code></p>
                      <p className="text-black"><strong>Password Salt:</strong> <code className="font-mono text-xs break-all text-black">{passwordResult.metadata.passwordSalt}</code></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Wallet Info */}
          {account && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-black mb-2">Connected Wallet</h3>
              <p className="text-sm text-black">
                <strong>Address:</strong> {account}
              </p>
              <p className="text-sm text-black">
                <strong>Chain:</strong> Base Sepolia (84532)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
