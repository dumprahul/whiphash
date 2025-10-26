import { NextResponse } from 'next/server';
import { Keypair } from '@nillion/nuc';
import { SecretVaultBuilderClient } from '@nillion/secretvaults';
import { config as loadEnv } from 'dotenv';

// Load environment variables
loadEnv();

export async function GET() {
  try {
    // Load environment variables
    const NILLION_API_KEY = process.env.NILLION_API_KEY;
    const NILLION_COLLECTION_ID = process.env.NILLION_COLLECTION_ID;

    // Validate environment variables
    if (!NILLION_API_KEY || !NILLION_COLLECTION_ID) {
      console.error('❌ Missing required environment variables:', {
        hasApiKey: !!NILLION_API_KEY,
        hasCollectionId: !!NILLION_COLLECTION_ID
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required environment variables: NILLION_API_KEY and NILLION_COLLECTION_ID' 
        },
        { status: 500 }
      );
    }

    console.log('🔍 Reading all records from NilDB collection...');
    console.log('📊 Collection ID:', NILLION_COLLECTION_ID);

    // Create builder client
    const builder = await SecretVaultBuilderClient.from({
      keypair: Keypair.from(NILLION_API_KEY),
      urls: {
        chain: 'http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz',
        auth: 'https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz',
        dbs: [
          'https://nildb-stg-n1.nillion.network',
          'https://nildb-stg-n2.nillion.network',
          'https://nildb-stg-n3.nillion.network',
        ],
      },
      blindfold: { operation: 'store' },
    });

    console.log('✅ Builder client created successfully');

    // Refresh authentication
    await builder.refreshRootToken();
    console.log('✅ Authentication refreshed');

    // Read all records from the collection
    const response = await builder.findData({
      collection: NILLION_COLLECTION_ID,
      filter: {}, // Empty filter returns all records
    });

    console.log(`✅ Found ${response.data.length} records in collection`);

    // Transform the data to be more frontend-friendly
    const transformedData = response.data.map((item: any) => {
      // Extract password from phone field (secret shared)
      const password = item.phone?.['%share'] || '[Encrypted - Cannot decrypt]';
      
      // Extract socials from email field (secret shared)
      const socials = item.email?.['%share'] || '[Encrypted - Cannot decrypt]';
      
      return {
        id: item._id || Math.random().toString(36),
        name: item.name || 'Unnamed Password',
        password: password,
        socials: socials,
        createdAt: item.createdAt || item.timestamp || new Date().toISOString(),
        txHash: item.txHash || item.metadata?.txHash || '',
        sequenceNumber: item.sequenceNumber || item.metadata?.sequenceNumber || '',
        // Include raw data for debugging
        rawData: item
      };
    });

    console.log('📊 Transformed data:', transformedData);

    return NextResponse.json({
      success: true,
      data: transformedData,
      totalRecords: response.data.length,
      collection: NILLION_COLLECTION_ID,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error reading collection:', error);
    
    let errorMessage = 'Failed to read passwords from NilDB';
    let errorDetails = 'Unknown error';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
      errorDetails = error;
    } else if (error && typeof error === 'object') {
      try {
        errorMessage = (error as { message?: string }).message || 'Object error';
        errorDetails = JSON.stringify(error, null, 2);
      } catch {
        errorMessage = 'Object error (could not stringify)';
        errorDetails = String(error);
      }
    }

    console.error('❌ Processed error details:', { errorMessage, errorDetails });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
