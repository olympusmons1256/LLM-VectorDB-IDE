import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({ 
  apiKey: process.env.PINECONE_API_KEY!
});

export async function GET() {
  try {
    console.log('Fetching Pinecone indexes...');
    const indexes = await pc.listIndexes();
    console.log('Received indexes:', indexes);
    return NextResponse.json({ indexes });
  } catch (error) {
    console.error('Error fetching indexes:', error);
    return NextResponse.json(
      { indexes: [], error: 'Failed to fetch indexes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, dimension = 1536, cloud = 'aws', region = 'us-east-1' } = await request.json();
    
    // Check if index already exists
    const existingIndexes = await pc.listIndexes();
    if (existingIndexes.some(index => index.name === name)) {
      return NextResponse.json(
        { error: `Index "${name}" already exists` },
        { status: 409 }
      );
    }
    
    await pc.createIndex({
      name,
      dimension,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud,
          region
        }
      }
    });

    // Wait for index to be ready
    let isReady = false;
    let retries = 0;
    const maxRetries = 10;

    while (!isReady && retries < maxRetries) {
      try {
        const index = await pc.describeIndex(name);
        if (index.status.ready) {
          isReady = true;
        } else {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error('Error checking index status:', error);
        retries++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!isReady) {
      throw new Error('Index creation timed out');
    }

    return NextResponse.json({ 
      success: true,
      message: 'Index created and ready'
    });
  } catch (error: any) {
    console.error('Error creating index:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create index' },
      { status: 500 }
    );
  }
}