// services/embedding.ts
interface EmbeddingProvider {
  provider: 'voyage';
}

interface VectorDBProvider {
  provider: 'pinecone';
  cloud: string;
  region: string;
  indexName: string;
}

export interface EmbeddingConfig {
  embedding: EmbeddingProvider;
  vectordb: VectorDBProvider;
  apiKeys: {
    voyage?: string;
    pinecone?: string;
  };
}

async function ensureIndexExists(config: EmbeddingConfig): Promise<void> {
  if (!config.vectordb.cloud || !config.vectordb.region || !config.vectordb.indexName) {
    throw new Error('Missing required configuration: cloud, region, and indexName are required');
  }

  const response = await fetch('/api/vector', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operation: 'ensure_index',
      config
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to ensure index exists');
  }
}

export async function processDocument(
  text: string,
  config: EmbeddingConfig,
  namespace?: string
): Promise<string> {
  try {
    // Ensure index exists
    await ensureIndexExists(config);

    // Process the document
    const response = await fetch('/api/vector', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'process_document',
        config,
        text,
        namespace
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to process document');
    }

    return 'Document processed and stored successfully';
  } catch (error: any) {
    console.error('Error processing document:', error);
    throw new Error(`Failed to process document: ${error.message}`);
  }
}

export async function queryContext(
  query: string,
  config: EmbeddingConfig,
  namespace?: string,
  filter?: any,
  limit: number = 5
): Promise<any[]> {
  try {
    const response = await fetch('/api/vector', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'query_context',
        config,
        query,
        namespace,
        filter,
        limit
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to query context');
    }

    const data = await response.json();
    return data.matches || [];
  } catch (error: any) {
    console.error('Error querying context:', error);
    throw new Error(`Failed to query context: ${error.message}`);
  }
}

export async function listNamespaces(config: EmbeddingConfig): Promise<string[]> {
  try {
    const response = await fetch('/api/vector', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'list_namespaces',
        config
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list namespaces');
    }

    const data = await response.json();
    return data.namespaces || [];
  } catch (error: any) {
    console.error('Error listing namespaces:', error);
    throw new Error(`Failed to list namespaces: ${error.message}`);
  }
}

export async function createNamespace(name: string, config: EmbeddingConfig): Promise<void> {
  try {
    const response = await fetch('/api/vector', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'create_namespace',
        config,
        namespace: name
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create namespace');
    }
  } catch (error: any) {
    console.error('Error creating namespace:', error);
    throw new Error(`Failed to create namespace: ${error.message}`);
  }
}

export async function deleteNamespace(name: string, config: EmbeddingConfig): Promise<void> {
  try {
    const response = await fetch('/api/vector', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'delete_namespace',
        config,
        namespace: name
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete namespace');
    }
  } catch (error: any) {
    console.error('Error deleting namespace:', error);
    throw new Error(`Failed to delete namespace: ${error.message}`);
  }
}

export async function getNamespaceStats(name: string, config: EmbeddingConfig): Promise<any> {
  try {
    const response = await fetch('/api/vector', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'describe_namespace',
        config,
        namespace: name
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get namespace stats');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error getting namespace stats:', error);
    throw new Error(`Failed to get namespace stats: ${error.message}`);
  }
}

export async function validateEmbeddingConfig(config: EmbeddingConfig): Promise<boolean> {
  try {
    // Validate required fields
    if (!config.vectordb.indexName || !config.vectordb.cloud || !config.vectordb.region) {
      return false;
    }

    // Validate API keys
    if (!config.apiKeys.pinecone || !config.apiKeys.voyage) {
      return false;
    }

    // Test connection
    await ensureIndexExists(config);
    return true;
  } catch (error) {
    console.error('Config validation error:', error);
    return false;
  }
}

export function createInitialEmbeddingConfig(): EmbeddingConfig {
  return {
    embedding: {
      provider: 'voyage'
    },
    vectordb: {
      provider: 'pinecone',
      cloud: 'aws',
      region: 'us-east-1',
      indexName: ''
    },
    apiKeys: {
      voyage: '',
      pinecone: ''
    }
  };
}