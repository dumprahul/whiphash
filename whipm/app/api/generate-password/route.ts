import { NextRequest, NextResponse } from 'next/server'
import argon2 from 'argon2'
import hkdf from 'futoin-hkdf'
import base64url from 'base64url'
import { concat } from 'uint8arrays/concat'

export interface PythRandomness {
  n1: string
  n2: string
  txHash: string
  sequenceNumber: string
}

export interface PasswordGenerationResult {
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

export async function POST(request: NextRequest) {
  try {
    const pythRandomness: PythRandomness = await request.json()
    
    console.log('🚀 Starting password generation process...')
    console.log('📊 Pyth randomness:', pythRandomness)
    
    // App salts (these should be consistent across the app)
    const appSalt1 = new Uint8Array(32)
    const appSalt2 = new Uint8Array(32)
    
    // Fill with deterministic values (in production, these should be app-specific constants)
    for (let i = 0; i < 32; i++) {
      appSalt1[i] = i
      appSalt2[i] = i + 32
    }
    
    const context = 'whiphash_password_generation_v1'
    const context2 = 'whiphash_password_seed_v1'
    
    // Step 1: Generate device secret (C)
    const deviceSecret = crypto.getRandomValues(new Uint8Array(32))
    console.log('🔐 Step 1: Generated device secret (C):', base64url.encode(Buffer.from(deviceSecret)))
    
    // Step 2: Extract R1 from Pyth randomness
    const r1 = BigInt(pythRandomness.n1)
    const r1Bytes = bigIntToUint8Array(r1, 32)
    console.log('🎲 Step 2: Extracted R1 from Pyth:', pythRandomness.n1)
    console.log('🎲 R1 bytes:', base64url.encode(Buffer.from(r1Bytes)))
    
    // Step 3: Mix R1 + C → local_raw (HKDF)
    const ikm = concat([r1Bytes, deviceSecret, new TextEncoder().encode(context)])
    const localRaw = hkdf(Buffer.from(ikm), 32, {
      hash: 'SHA-256',
      salt: Buffer.from(appSalt1),
      info: 'local_raw_v1'
    })
    console.log('🔗 Step 3: Generated local_raw (HKDF):', base64url.encode(Buffer.from(localRaw)))
    
    // Step 4: Harden local_raw → LocalKey (Argon2id)
    const salt1 = crypto.getRandomValues(new Uint8Array(16))
    const argon2Params = {
      memory: 65536, // 64 MB
      time: 3,
      parallelism: 4
    }
    
    const localKey = await argon2.hash(Buffer.from(localRaw), {
      type: argon2.argon2id,
      memoryCost: argon2Params.memory,
      timeCost: argon2Params.time,
      parallelism: argon2Params.parallelism,
      salt: Buffer.from(salt1),
      hashLength: 32,
      raw: true
    })
    
    console.log('🛡️ Step 4: Generated LocalKey (Argon2id):', base64url.encode(Buffer.from(localKey)))
    console.log('🛡️ Salt1:', base64url.encode(Buffer.from(salt1)))
    console.log('🛡️ Argon2 params:', argon2Params)
    
    // Step 5: Extract R2 from Pyth randomness
    const r2 = BigInt(pythRandomness.n2)
    const r2Bytes = bigIntToUint8Array(r2, 32)
    console.log('🎲 Step 5: Extracted R2 from Pyth:', pythRandomness.n2)
    console.log('🎲 R2 bytes:', base64url.encode(Buffer.from(r2Bytes)))
    
    // Step 6: Derive seed and final harden → Password_bytes
    const ikm2 = concat([new Uint8Array(localKey), r2Bytes, new TextEncoder().encode(context2)])
    const seedRaw = hkdf(Buffer.from(ikm2), 32, {
      hash: 'SHA-256',
      salt: Buffer.from(appSalt2),
      info: 'seed_v1'
    })
    
    console.log('🌱 Step 6a: Generated seed_raw:', base64url.encode(Buffer.from(seedRaw)))
    
    // Generate password_salt and final password bytes
    const passwordSalt = crypto.getRandomValues(new Uint8Array(16))
    
    const passwordBytes = await argon2.hash(Buffer.from(seedRaw), {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
      salt: Buffer.from(passwordSalt),
      hashLength: 32,
      raw: true
    })
    
    console.log('🔑 Step 6b: Generated Password_bytes:', base64url.encode(Buffer.from(passwordBytes)))
    console.log('🔑 Password salt:', base64url.encode(Buffer.from(passwordSalt)))
    
    // Convert to human-readable password
    const password = convertToPassword(new Uint8Array(passwordBytes))
    console.log('🎯 Final password generated:', password)
    
    const result: PasswordGenerationResult = {
      password,
      metadata: {
        txHash: pythRandomness.txHash,
        sequenceNumber: pythRandomness.sequenceNumber,
        deviceSecret: base64url.encode(Buffer.from(deviceSecret)),
        r1: pythRandomness.n1,
        r2: pythRandomness.n2,
        localRaw: base64url.encode(Buffer.from(localRaw)),
        localKey: base64url.encode(Buffer.from(localKey)),
        seedRaw: base64url.encode(Buffer.from(seedRaw)),
        passwordBytes: base64url.encode(Buffer.from(passwordBytes)),
        salt1: base64url.encode(Buffer.from(salt1)),
        passwordSalt: base64url.encode(Buffer.from(passwordSalt)),
        argon2Params
      }
    }
    
    console.log('✅ Password generation completed!')
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error generating password:', error)
    return NextResponse.json(
      { error: 'Failed to generate password' },
      { status: 500 }
    )
  }
}

function bigIntToUint8Array(bigInt: bigint, length: number): Uint8Array {
  const hex = bigInt.toString(16).padStart(length * 2, '0')
  const bytes = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

function convertToPassword(passwordBytes: Uint8Array): string {
  // Use a character set that includes letters, numbers, and symbols
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
  
  let password = ''
  for (let i = 0; i < passwordBytes.length; i++) {
    const index = passwordBytes[i] % charset.length
    password += charset[index]
  }
  
  // Ensure minimum length of 16 characters
  while (password.length < 16) {
    const extraIndex = passwordBytes[password.length % passwordBytes.length] % charset.length
    password += charset[extraIndex]
  }
  
  return password
}
