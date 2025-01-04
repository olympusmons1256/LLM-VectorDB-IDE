import { Pinecone } from '@pinecone-database/pinecone';

export interface PineconeIndex {
  name: string;
  dimension: number;
  metric: string;
  host?: string;
  spec: {
    serverless?: {
      cloud: string;
      region: string;
    };
    pod?: {
      environment: string;
      podType: string;
      pods: number;
      replicas?: number;
      shards?: number;
    };
  };
  status: {
    ready: boolean;
    state: string;
  };
}

export interface IndexStats {
  namespaces: {
    [key: string]: {
      vectorCount: number;
      totalVectorDimensions?: number;
    };
  };
  dimension: number;
  indexFullness: number;
  totalVectorCount: number;
}

const pc = new Pinecone({ 
  apiKey: process.env.PINECONE_API_KEY!
});

export async function listIndexes(): Promise<PineconeIndex[]> {
  try {
    const indexes = await pc.listIndexes();
    return indexes;
  } catch (error) {
    console.error('Error listing indexes:', error);
    throw error;
  }
}

export async function createIndex(
  name: string,
  dimension: number = 1536,
  metric: string = 'cosine',
  cloud: string = 'aws',
  region: string = 'us-east-1'
): Promise<void> {
  try {
    await pc.createIndex({
      name,
      dimension,
      metric,
      spec: {
        serverless: {
          cloud,
          region
        }
      }
    });
  } catch (error) {
    console.error('Error creating index:', error);
    throw error;
  }
}

export async function deleteIndex(name: string): Promise<void> {
  try {
    await pc.deleteIndex(name);
  } catch (error) {
    console.error('Error deleting index:', error);
    throw error;
  }
}

export async function describeIndex(name: string): Promise<PineconeIndex> {
  try {
    const index = await pc.describeIndex(name);
    return index;
  } catch (error) {
    console.error('Error describing index:', error);
    throw error;
  }
}

export async function getNamespaces(indexName: string): Promise<string[]> {
  try {
    const index = pc.index(indexName);
    const stats = await index.describeIndexStats();
    return Object.keys(stats.namespaces || {});
  } catch (error) {
    console.error('Error getting namespaces:', error);
    throw error;
  }
}

export async function getNamespaceStats(
  indexName: string,
  namespace: string
): Promise<IndexStats['namespaces'][string] | null> {
  try {
    const index = pc.index(indexName);
    const stats = await index.describeIndexStats();
    return stats.namespaces[namespace] || null;
  } catch (error) {
    console.error('Error getting namespace stats:', error);
    throw error;
  }
}

export async function describeIndexStats(indexName: string): Promise<IndexStats> {
  try {
    const index = pc.index(indexName);
    const stats = await index.describeIndexStats();
    return stats;
  } catch (error) {
    console.error('Error describing index stats:', error);
    throw error;
  }
}