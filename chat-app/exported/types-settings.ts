// types/settings.ts
export interface VectorDBConfig {
  cloud: string
  region: string
  indexName: string  // Adding this
}

export interface APIKeys {
  anthropic?: string
  openai?: string
  voyage?: string
  pinecone?: string
}