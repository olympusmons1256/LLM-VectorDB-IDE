// app/api/vector/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 500;
const MAX_CHUNKS_PER_FILE = 50;
const VECTOR_DIMENSION = 1536;
const MAX_QUERY_RESULTS = 10000;

interface FileMetadata {
 filename: string;
 type: 'project-structure' | 'core-architecture' | 'code' | 'documentation' | 'plan';
 section: 'full' | 'chunks' | 'plans' | 'instructions' | 'documentation';
 timestamp: string;
 chunkIndex?: number;
 totalChunks?: number;
 isComplete?: boolean;
 size?: number;
 planId?: string;
 plan?: string;
}

interface ChunkInfo {
 text: string;
 metadata: FileMetadata;
}

interface Config {
 apiKeys: {
   voyage?: string;
   pinecone?: string;
 };
 vectordb: {
   provider: 'pinecone';
   indexName: string;
   cloud: string;
   region: string;
 };
 embedding: {
   provider: 'voyage';
 };
}

interface ContextMatch {
 text: string;
 filename?: string;
 type?: string;
 isComplete?: boolean;
 metadata?: FileMetadata;
}

function createInitializationVector(dimension: number = VECTOR_DIMENSION): number[] {
 const vector = new Array(dimension).fill(0);
 for (let i = 0; i < dimension; i += 100) {
   vector[i] = 0.0001;
 }
 return vector;
}

function getTextSizeInBytes(text: string | undefined): number {
 if (!text) return 0;
 return new TextEncoder().encode(text).length;
}

function categorizeFile(filename: string): FileMetadata['type'] {
 if (filename.includes('plan-') && (filename.endsWith('.json') || filename.endsWith('.md'))) {
   return 'plan';
 }
 
 if (filename.includes('package.json') || 
     filename.includes('tsconfig.json') ||
     filename.includes('next.config') ||
     filename.includes('.env') ||
     filename.includes('README')) {
   return 'project-structure';
 }
 
 if (filename.includes('/app/') || 
     filename.includes('/api/') ||
     filename.includes('layout.') ||
     filename.includes('route.') ||
     filename.includes('/lib/') ||
     filename.includes('/services/')) {
   return 'core-architecture';
 }

 if (filename.includes('/docs/') ||
     filename.includes('.md')) {
   return 'documentation';
 }

 return 'code';
}

function determineSectionByType(type: FileMetadata['type']): FileMetadata['section'] {
 switch (type) {
   case 'plan':
     return 'plans';
   case 'documentation':
     return 'documentation';
   default:
     return 'full';
 }
}

function createChunks(text: string, filename: string): ChunkInfo[] {
 const chunks: ChunkInfo[] = [];
 const timestamp = new Date().toISOString();
 const fileType = categorizeFile(filename);
 const size = getTextSizeInBytes(text);
 const baseSection = determineSectionByType(fileType);
 
 // Store the complete file in its appropriate section
 chunks.push({
   text,
   metadata: {
     filename,
     type: fileType,
     section: baseSection,
     timestamp,
     isComplete: true,
     size
   }
 });

 // Only create search chunks for code and documentation files
 if (fileType === 'code' || fileType === 'documentation' || fileType === 'core-architecture') {
   let currentIndex = 0;
   let chunkIndex = 0;
   const totalChunks = Math.ceil(text.length / (CHUNK_SIZE - CHUNK_OVERLAP));

   while (currentIndex < text.length && chunks.length < MAX_CHUNKS_PER_FILE) {
     const chunk = text.slice(
       Math.max(0, currentIndex),
       Math.min(text.length, currentIndex + CHUNK_SIZE)
     );

     if (chunk.trim()) {
       chunks.push({
         text: chunk,
         metadata: {
           filename,
           type: fileType,
           section: 'chunks',
           timestamp,
           chunkIndex,
           totalChunks,
           isComplete: false,
           size: getTextSizeInBytes(chunk)
         }
       });
       chunkIndex++;
     }

     currentIndex += (CHUNK_SIZE - CHUNK_OVERLAP);
   }
 }

 return chunks;
}

async function queryBySection(
 index: any,
 namespace: string,
 section: string,
 filter?: any
): Promise<any[]> {
 const baseFilter = { section: { $eq: section } };
 const combinedFilter = filter ? { $and: [baseFilter, filter] } : baseFilter;

 const results = await index.namespace(namespace).query({
   vector: createInitializationVector(),
   filter: combinedFilter,
   includeMetadata: true,
   topK: MAX_QUERY_RESULTS
 });

 return results.matches || [];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
 try {
   const body = await request.json();
   const { operation, config, text, filename, namespace, filter, includeTypes } = body;

   if (!config?.apiKeys?.pinecone || !config?.vectordb?.indexName) {
     return NextResponse.json(
       { error: 'Missing required configuration' },
       { status: 400 }
     );
   }

   console.log('Vector operation:', operation);
   console.log('Namespace:', namespace);
   console.log('Config:', {
     indexName: config.vectordb.indexName,
     cloud: config.vectordb.cloud,
     region: config.vectordb.region
   });

   const pinecone = new Pinecone({
     apiKey: config.apiKeys.pinecone
   });

   const index = pinecone.index(config.vectordb.indexName);

   switch (operation) {
     case 'describe_namespace': {
       try {
         console.log('Describing namespace:', namespace);
         
         const stats = await index.describeIndexStats();
         console.log('Overall index stats:', JSON.stringify(stats, null, 2));

         if (!namespace) {
           return NextResponse.json({ stats });
         }

         const nsStats = await index.namespace(namespace).describeIndexStats();
         console.log(`Stats for namespace ${namespace}:`, JSON.stringify(nsStats, null, 2));

         const sampleRecord = await index.namespace(namespace).query({
           vector: createInitializationVector(),
           includeMetadata: true,
           topK: 1
         });
         console.log('Sample record:', JSON.stringify(sampleRecord, null, 2));

         return NextResponse.json({
           stats,
           namespaceStats: nsStats,
           sampleRecord
         });

       } catch (error: any) {
         console.error('Error describing namespace:', error);
         return NextResponse.json(
           { error: 'Failed to describe namespace', details: error.message },
           { status: 500 }
         );
       }
     }

     case 'list_namespaces': {
       try {
         const stats = await index.describeIndexStats();
         
         const namespaces: Record<string, { 
           recordCount: number;
           hasDocumentation: boolean;
           totalSize: number;
         }> = {};

         if (stats.namespaces) {
           for (const [name, data] of Object.entries(stats.namespaces)) {
             if (name && name.trim() !== '') {
               const indexNs = index.namespace(name);
               const completeFiles = await indexNs.query({
                 vector: createInitializationVector(),
                 filter: { 
                   isComplete: { $eq: true },
                   section: { $ne: 'chunks' }
                 },
                 includeMetadata: true,
                 topK: MAX_QUERY_RESULTS
               });

               namespaces[name] = {
                 recordCount: completeFiles.matches?.length || 0,
                 hasDocumentation: completeFiles.matches?.some(m => m.metadata?.type === 'documentation') || false,
                 totalSize: completeFiles.matches?.reduce((sum, m) => {
                   const size = m.metadata?.size || getTextSizeInBytes(m.metadata?.text);
                   return sum + size;
                 }, 0) || 0
               };
             }
           }
         }

         return NextResponse.json({ namespaces });
       } catch (error: any) {
         console.error('Error listing namespaces:', error);
         return NextResponse.json(
           { error: 'Failed to list namespaces', details: error.message },
           { status: 500 }
         );
       }
     }

     case 'create_namespace': {
       if (!namespace) {
         return NextResponse.json(
           { error: 'Namespace name is required' },
           { status: 400 }
         );
       }

       try {
         console.log('Creating namespace:', namespace);
         
         const initVectors = Array.from({ length: 3 }, (_, i) => ({
           id: `${namespace}-init-${i}`,
           values: createInitializationVector(),
           metadata: {
             initialized: true,
             timestamp: new Date().toISOString()
           }
         }));

         await index.namespace(namespace).upsert(initVectors);

         return NextResponse.json({
           success: true,
           namespace,
           timestamp: new Date().toISOString()
         });
       } catch (error: any) {
         console.error('Error creating namespace:', error);
         return NextResponse.json(
           { error: 'Failed to create namespace', details: error.message },
           { status: 500 }
         );
       }
     }

     case 'delete_namespace': {
       if (!namespace) {
         return NextResponse.json(
           { error: 'Namespace is required' },
           { status: 400 }
         );
       }

       try {
         await index.namespace(namespace).deleteAll();
         return NextResponse.json({
           success: true,
           namespace,
           timestamp: new Date().toISOString()
         });
       } catch (error: any) {
         console.error('Error deleting namespace:', error);
         return NextResponse.json(
           { error: 'Failed to delete namespace', details: error.message },
           { status: 500 }
         );
       }
     }

     case 'delete_document': {
       if (!namespace || !filter) {
         return NextResponse.json(
           { error: 'Namespace and filter are required' },
           { status: 400 }
         );
       }

       try {
         console.log('Deleting documents with filter:', filter);
         const indexNs = index.namespace(namespace);
         
         const queryResponse = await indexNs.query({
           vector: createInitializationVector(),
           filter: filter,
           includeMetadata: true,
           topK: MAX_QUERY_RESULTS
         });

         if (!queryResponse.matches?.length) {
           return NextResponse.json({
             success: true,
             message: 'No matching documents found to delete',
             namespace,
             timestamp: new Date().toISOString()
           });
         }

         const deletePromises = queryResponse.matches.map(match => 
           indexNs.deleteOne(match.id)
         );

         await Promise.all(deletePromises);

         return NextResponse.json({
           success: true,
           deletedCount: queryResponse.matches.length,
           namespace,
           timestamp: new Date().toISOString()
         });
       } catch (error: any) {
         console.error('Error deleting document:', error);
         return NextResponse.json(
           { 
             error: 'Failed to delete document', 
             details: error.message,
             stack: error.stack
           },
           { status: 500 }
         );
       }
     }

     case 'process_document': {
       if (!text || !filename) {
         return NextResponse.json(
           { error: 'Text content and filename are required' },
           { status: 400 }
         );
       }

       try {
         console.log('Processing document:', {
           filename,
           namespace,
           metadata: body.metadata
         });

         const chunks = createChunks(text, filename);
         console.log('Created chunks:', chunks.length);
         
         const indexNs = namespace ? index.namespace(namespace) : index;

         await new Promise(resolve => setTimeout(resolve, 1000));
         
         for (const chunk of chunks) {
           const voyageResponse = await fetch('https://api.voyageai.com/v1/embeddings', {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${config.apiKeys.voyage}`
             },
             body: JSON.stringify({
               model: 'voyage-code-2',
               input: chunk.text
             })
           });

           if (!voyageResponse.ok) {
             throw new Error('Failed to get embeddings from Voyage');
           }

           const embeddings = await voyageResponse.json();
           const embedding = embeddings.data[0].embedding;

           const id = chunk.metadata.isComplete 
             ? `${filename}-${chunk.metadata.section}-${Date.now()}`
             : `${filename}-chunk-${chunk.metadata.chunkIndex}-${Date.now()}`;

           console.log('Upserting chunk:', {
             id,
             section: chunk.metadata.section,
             isComplete: chunk.metadata.isComplete
           });

           await indexNs.upsert([{
             id,
             values: embedding,
             metadata: {
               ...chunk.metadata,
               ...body.metadata
             }
           }]);
         }

         await new Promise(resolve => setTimeout(resolve, 1000));

         const verifyQuery = await indexNs.query({
           vector: createInitializationVector(),
           filter: {
             'metadata.filename': { $eq: filename }
           },
           includeMetadata: true,
           topK: chunks.length
         });

         console.log('Verification query results:', JSON.stringify(verifyQuery, null, 2));

         return NextResponse.json({
           success: true,
           chunksProcessed: chunks.length,
           filename,
           namespace,
           timestamp: new Date().toISOString(),
           verificationResults: verifyQuery
         });
       } catch (error: any) {
         console.error('Error processing document:', error);
         return NextResponse.json(
           { error: 'Failed to process document', details: error.message },
           { status: 500 }
         );
       }
     }

     case 'query_context': {
       if (!text) {
         return NextResponse.json(
           { error: 'Query text is required' },
           { status: 400 }
         );
       }

       try {
         console.log('Vector query starting');
         console.log('Namespace:', namespace);
         console.log('Filter:', JSON.stringify(filter, null, 2));

         // First try a simple query without filters
         const simpleQuery = await index.namespace(namespace).query({
           vector: createInitializationVector(),
           topK: MAX_QUERY_RESULTS,
           includeMetadata: true
         });
         console.log('Simple query results:', JSON.stringify(simpleQuery, null, 2));

         // Then try with just the metadata filter
         if (filter) {
           const metadataQuery = await index.namespace(namespace).query({
             vector: createInitializationVector(),
             filter: filter,
             includeMetadata: true,
             topK: MAX_QUERY_RESULTS
           });
           console.log('Metadata query results:', JSON.stringify(metadataQuery, null, 2));
         }

         const voyageResponse = await fetch('https://api.voyageai.com/v1/embeddings', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${config.apiKeys.voyage}`
           },
           body: JSON.stringify({
             model: 'voyage-code-2',
             input: text
           })
         });

         if (!voyageResponse.ok) {
           throw new Error('Failed to get query embeddings from Voyage');
         }

         const embeddings = await voyageResponse.json();
         const queryEmbedding = embeddings.data[0].embedding;

         const indexNs = namespace ? index.namespace(namespace) : index;

         let queryOptions = {
           vector: queryEmbedding,
           includeMetadata: true,
           includeValues: true,
           topK: MAX_QUERY_RESULTS
         };

         // Build filter based on includeTypes and sections
         const typeFilter = includeTypes?.length > 0 
           ? { type: { $in: includeTypes } }
           : undefined;

         const sectionFilter = {
           $or: [
             { section: { $eq: 'full' } },
             { section: { $eq: 'chunks' } },
             { section: { $eq: 'plans' } }
           ]
         };

         if (filter) {
           queryOptions.filter = filter;
         } else if (typeFilter) {
           queryOptions.filter = { $and: [typeFilter, sectionFilter] };
         } else {
           queryOptions.filter = sectionFilter;
         }

         console.log('Final query options:', JSON.stringify(queryOptions, null, 2));
         const results = await indexNs.query(queryOptions);
         console.log('Final query results:', JSON.stringify(results, null, 2));

         // Deduplicate results by filename, preferring full versions
         const uniqueResults = new Map();
         results.matches?.forEach(match => {
           const filename = match.metadata?.filename;
           if (!filename) return;

           const existing = uniqueResults.get(filename);
           if (!existing || 
               (match.metadata?.isComplete && !existing.metadata?.isComplete) ||
               (!existing.metadata?.isComplete && match.metadata?.timestamp > existing.metadata?.timestamp)) {
             uniqueResults.set(filename, match);
           }
         });

         return NextResponse.json({
           matches: Array.from(uniqueResults.values()).map(match => ({
             text: match.metadata?.text || '',
             filename: match.metadata?.filename,
             type: match.metadata?.type,
             section: match.metadata?.section,
             isComplete: match.metadata?.isComplete,
             metadata: match.metadata,
             values: match.values
           }))
         });
       } catch (error: any) {
         console.error('Error querying context:', error);
         return NextResponse.json(
           { error: 'Failed to query context', details: error.message },
           { status: 500 }
         );
       }
     }

     case 'ensure_index': {
       try {
         console.log('Ensuring index exists');
         const stats = await index.describeIndexStats();
         console.log('Index stats:', JSON.stringify(stats, null, 2));
         return NextResponse.json({ success: true, stats });
       } catch (error: any) {
         console.error('Error ensuring index:', error);
         return NextResponse.json(
           { error: 'Failed to ensure index exists', details: error.message },
           { status: 500 }
         );
       }
     }

     default:
       return NextResponse.json(
         { error: 'Invalid operation' },
         { status: 400 }
       );
   }
 } catch (error: any) {
   console.error('Vector operation error:', error);
   return NextResponse.json(
     { error: error.message || 'Internal server error', details: error.stack },
     { status: 500 }
   );
 }
}