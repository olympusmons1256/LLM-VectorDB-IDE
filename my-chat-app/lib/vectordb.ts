import { Pinecone } from '@pinecone-database/pinecone';

const PINECONE_API_KEY = process.env.PINECONE_API_KEY!;
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY!;
const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 1000; // 50% overlap for better context

export async function processFileUpload(
  file: File, 
  path: string, 
  indexName: string, 
  namespace: string
) {
  try {
    // 1. Read the file content
    const text = await file.text();
    
    // 2. Add file metadata to the text
    const fileContext = `File Path: ${path}\nFile Name: ${file.name}\nContent:\n${text}`;
    
    // 3. Split into chunks with overlap
    const chunks = splitIntoChunks(fileContext, CHUNK_SIZE, CHUNK_OVERLAP);
    
    // 4. Get embeddings from Voyage
    const voyageResponse = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VOYAGE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'voyage-2',
        input: chunks
      })
    });

    if (!voyageResponse.ok) {
      throw new Error('Failed to get embeddings');
    }

    const embeddings = await voyageResponse.json();

    // 5. Initialize Pinecone
    const pc = new Pinecone({ apiKey: PINECONE_API_KEY });

    // 6. Get index reference
    const index = pc.index(indexName);

    // 7. Prepare vectors for upsert
    const vectors = chunks.map((chunk, i) => ({
      id: `${path}-chunk-${i}`,
      values: embeddings.data[i].embedding,
      metadata: {
        text: chunk,
        filename: file.name,
        path: path,
        chunk_index: i,
        total_chunks: chunks.length,
        chunk_size: CHUNK_SIZE,
        chunk_overlap: CHUNK_OVERLAP
      }
    }));

    // 8. Upsert to Pinecone in batches of 100
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.namespace(namespace).upsert(batch);
    }

    return {
      chunkCount: chunks.length,
      filename: file.name,
      path: path
    };
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
}

function splitIntoChunks(text: string, size: number, overlap: number): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    if (currentLength + word.length > size) {
      // Save current chunk
      chunks.push(currentChunk.join(' '));
      
      // Start new chunk with overlap
      const overlapWordCount = Math.ceil(overlap / 5); // approximate words for overlap
      const overlapStart = Math.max(0, currentChunk.length - overlapWordCount);
      currentChunk = currentChunk.slice(overlapStart);
      currentChunk.push(word);
      currentLength = currentChunk.join(' ').length;
    } else {
      currentChunk.push(word);
      currentLength += word.length + 1; // +1 for space
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

export async function queryVectorStore(
  query: string, 
  indexName: string, 
  namespace: string
) {
  try {
    // 1. Get query embedding from Voyage
    const voyageResponse = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VOYAGE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'voyage-2',
        input: query
      })
    });

    if (!voyageResponse.ok) {
      throw new Error('Failed to get query embedding');
    }

    const embeddings = await voyageResponse.json();
    const queryEmbedding = embeddings.data[0].embedding;

    // 2. Query Pinecone
    const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pc.index(indexName);
    
    const queryResponse = await index.namespace(namespace).query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true
    });

    // 3. Format and return results
    return queryResponse.matches.map(match => ({
      text: match.metadata?.text,
      score: match.score,
      filename: match.metadata?.filename,
      path: match.metadata?.path
    }));
  } catch (error) {
    console.error('Error querying vector store:', error);
    throw error;
  }
}

export async function listIndexes(): Promise<{ name: string; dimension: number }[]> {
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  const indexes = await pc.listIndexes();
  return indexes;
}

export async function createIndex(name: string, dimension: number = 1536) {
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  await pc.createIndex({
    name,
    dimension,
    metric: 'cosine',
    spec: {
      serverless: {
        cloud: 'aws',
        region: 'us-east-1'
      }
    }
  });
}

export async function listNamespaces(indexName: string): Promise<string[]> {
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pc.index(indexName);
  const stats = await index.describeIndexStats();
  return Object.keys(stats.namespaces || {});
}