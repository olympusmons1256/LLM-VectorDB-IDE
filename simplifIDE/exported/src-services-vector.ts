// src/services/vector.ts
import { VectorDBConfig, EmbeddingConfig } from '@/types/settings';
import { VectorSearchResult } from '@/components/DocumentManager/types';

export class VectorService {
  private config: VectorDBConfig;
  private embeddingConfig: EmbeddingConfig;

  constructor(config: VectorDBConfig, embeddingConfig: EmbeddingConfig) {
    this.config = config;
    this.embeddingConfig = embeddingConfig;
    this.validateConfig();
  }

  private validateConfig() {
    if (!this.embeddingConfig.apiKey) {
      throw new Error('Embedding API key is required');
    }
    if (!this.config.apiKey) {
      throw new Error('Vector DB API key is required');
    }
    if (!this.config.indexName || !this.config.cloud || !this.config.region) {
      throw new Error('Vector DB configuration is incomplete');
    }
  }

  private async getEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.embeddingConfig.apiKey}`
        },
        body: JSON.stringify({
          model: 'voyage-code-2',
          input: texts,
          input_type: 'document'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 401) {
          throw new Error('Invalid embedding API key. Please check your configuration.');
        }
        throw new Error(error.error || 'Failed to get embeddings');
      }

      const data = await response.json();
      return data.data.map((item: any) => item.embedding);
    } catch (error) {
      console.error('Failed to get embeddings:', error);
      throw error;
    }
  }

  private async upsertVectors(vectors: { id: string; values: number[]; metadata?: any }[]): Promise<void> {
    const host = `${this.config.indexName}-${this.config.cloud}.${this.config.region}.pinecone.io`;
    
    try {
      const response = await fetch(`https://${host}/vectors/upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': this.config.apiKey
        },
        body: JSON.stringify({
          vectors,
          namespace: this.config.namespace
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 401) {
          throw new Error('Invalid vector DB API key. Please check your configuration.');
        }
        throw new Error(error.error || 'Failed to upsert vectors');
      }
    } catch (error) {
      console.error('Failed to upsert vectors:', error);
      throw error;
    }
  }

  private splitIntoChunks(text: string, maxChunkSize: number = 1000): string[] {
    const chunks: string[] = [];
    let currentChunk = '';
    
    const lines = text.split(/\n/);
    
    for (const line of lines) {
      if (line.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        let remaining = line;
        while (remaining.length > maxChunkSize) {
          const chunk = remaining.slice(0, maxChunkSize);
          chunks.push(chunk.trim());
          remaining = remaining.slice(maxChunkSize);
        }
        if (remaining) currentChunk = remaining;
        
      } else if ((currentChunk + '\n' + line).length > maxChunkSize) {
        chunks.push(currentChunk.trim());
        currentChunk = line;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n' + line : line;
      }
    }

    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
  }

  async processDocument(content: string, metadata: any = {}): Promise<{
    chunks: number;
    vectorIds: string[];
    chunkContent: string[];
    embeddings: number[][];
  }> {
    try {
      const chunks = this.splitIntoChunks(content);
      console.log(`Processing ${chunks.length} chunks for document`);

      const embeddings = await this.getEmbeddings(chunks);
      console.log('Generated embeddings for chunks');

      const vectorIds = chunks.map((_, index) => `${metadata.documentId}_chunk_${index}`);

      const vectors = chunks.map((chunk, index) => ({
        id: vectorIds[index],
        values: embeddings[index],
        metadata: {
          ...metadata,
          chunk_index: index,
          chunk_content: chunk
        }
      }));

      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await this.upsertVectors(batch);
      }

      return {
        chunks: chunks.length,
        vectorIds,
        chunkContent: chunks,
        embeddings
      };
    } catch (error) {
      console.error('Document processing failed:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    const host = `${this.config.indexName}-${this.config.cloud}.${this.config.region}.pinecone.io`;
    
    try {
      const response = await fetch(`https://${host}/vectors/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': this.config.apiKey
        },
        body: JSON.stringify({
          filter: {
            documentId
          },
          namespace: this.config.namespace
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 401) {
          throw new Error('Invalid vector DB API key. Please check your configuration.');
        }
        throw new Error(error.error || 'Failed to delete vectors');
      }
    } catch (error) {
      console.error('Failed to delete vectors:', error);
      throw error;
    }
  }

  async searchDocuments(query: string, topK: number = 5): Promise<VectorSearchResult[]> {
    const host = `${this.config.indexName}-${this.config.cloud}.${this.config.region}.pinecone.io`;
    
    try {
      const queryEmbeddings = await this.getEmbeddings([query]);

      const response = await fetch(`https://${host}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': this.config.apiKey
        },
        body: JSON.stringify({
          vector: queryEmbeddings[0],
          topK,
          includeMetadata: true,
          namespace: this.config.namespace
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 401) {
          throw new Error('Invalid vector DB API key. Please check your configuration.');
        }
        throw new Error(error.error || 'Failed to search vectors');
      }

      const data = await response.json();
      return data.matches.map((match: any) => ({
        documentId: match.metadata.documentId,
        chunkIndex: match.metadata.chunk_index,
        score: match.score,
        content: match.metadata.chunk_content,
        metadata: match.metadata
      }));
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test embedding API
      await this.getEmbeddings(['Test connection']);

      // Test vector DB connection
      const host = `${this.config.indexName}-${this.config.cloud}.${this.config.region}.pinecone.io`;
      const response = await fetch(`https://${host}/describe_index_stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': this.config.apiKey
        },
        body: JSON.stringify({
          namespace: this.config.namespace
        })
      });

      if (!response.ok) {
        throw new Error('Vector DB connection test failed');
      }

      return true;
    } catch (error) {
      console.error('Vector service connection test failed:', error);
      throw new Error(`Vector service connection test failed: ${error.message}`);
    }
  }

  updateConfig(config: Partial<VectorDBConfig>, embeddingConfig?: EmbeddingConfig) {
    this.config = { ...this.config, ...config };
    if (embeddingConfig) {
      this.embeddingConfig = embeddingConfig;
    }
    this.validateConfig();
  }
}