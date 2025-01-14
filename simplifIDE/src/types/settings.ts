// types/settings.ts

export type LLMProvider = 'anthropic' | 'openai';
export type VectorDBProvider = 'pinecone';
export type EmbeddingProvider = 'voyage';

export interface LLMConfig {
  provider: LLMProvider;
  modelId: string;
  apiKey?: string;
  temperature: number;
  maxTokens?: number;
}

export interface VectorDBConfig {
  provider: VectorDBProvider;
  indexName: string;
  cloud: string;
  region: string;
  apiKey?: string;
  namespace: string;
}

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  apiKey?: string;
}

export interface PlanExecutionConfig {
  defaultModel: {
    provider: LLMProvider;
    modelId: string;
  };
  autoExecute: boolean;
  maxSteps: number;
}

export interface CanvasConfig {
  id: string;
  llm: LLMConfig;
  vectordb: VectorDBConfig;
  embedding: EmbeddingConfig;
  planExecution: PlanExecutionConfig;
}

export interface SettingsState {
  canvasConfigs: Record<string, CanvasConfig>;
  globalDefaults: Partial<CanvasConfig>;
  activeCanvasId: string | null;
}

export const MODEL_OPTIONS = [
  { provider: 'anthropic' as const, id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
  { provider: 'anthropic' as const, id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
  { provider: 'anthropic' as const, id: 'claude-3-haiku-20240229', name: 'Claude 3 Haiku' },
  { provider: 'openai' as const, id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo' },
  { provider: 'openai' as const, id: 'gpt-4', name: 'GPT-4' },
  { provider: 'openai' as const, id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
] as const;

export type ModelOption = typeof MODEL_OPTIONS[number];

interface LegacyConfig {
  apiKeys?: {
    anthropic?: string;
    openai?: string;
    voyage?: string;
    pinecone?: string;
  };
  defaultProvider?: 'anthropic' | 'openai';
  defaultModel?: string;
  temperature?: number;
  vectordb?: {
    indexName?: string;
    cloud?: string;
    region?: string;
  };
}

export interface Settings {
  canvasConfigs: Record<string, CanvasConfig>;
  globalDefaults: LegacyConfig;
  activeCanvasId: string | null;
}