// src/utils/settings-migration.ts
import { nanoid } from 'nanoid';
import type { CanvasConfig } from '../types/settings';
import { validateCanvasConfig } from './settings-validation';

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

export async function migrateFromLegacyConfig(
  legacyConfig: LegacyConfig, 
  canvasId = nanoid()
): Promise<CanvasConfig> {
  const config: CanvasConfig = {
    id: canvasId,
    llm: {
      provider: legacyConfig.defaultProvider || 'anthropic',
      modelId: legacyConfig.defaultModel || 'claude-3-sonnet-20240229',
      apiKey: legacyConfig.apiKeys?.[legacyConfig.defaultProvider || 'anthropic'],
      temperature: legacyConfig.temperature || 0.7,
    },
    vectordb: {
      provider: 'pinecone',
      indexName: legacyConfig.vectordb?.indexName || '',
      cloud: legacyConfig.vectordb?.cloud || '',
      region: legacyConfig.vectordb?.region || '',
      apiKey: legacyConfig.apiKeys?.pinecone,
      namespace: `canvas-${canvasId}`,
    },
    embedding: {
      provider: 'voyage',
      apiKey: legacyConfig.apiKeys?.voyage,
    },
    planExecution: {
      defaultModel: {
        provider: legacyConfig.defaultProvider || 'anthropic',
        modelId: legacyConfig.defaultModel || 'claude-3-sonnet-20240229',
      },
      autoExecute: false,
      maxSteps: 10,
    },
  };

  // Validate the migrated config
  await validateCanvasConfig(config);
  
  return config;
}

export async function migrateMultipleConfigs(
  legacyConfigs: Record<string, LegacyConfig>
): Promise<Record<string, CanvasConfig>> {
  const migratedConfigs: Record<string, CanvasConfig> = {};

  for (const [id, legacyConfig] of Object.entries(legacyConfigs)) {
    try {
      migratedConfigs[id] = await migrateFromLegacyConfig(legacyConfig, id);
    } catch (error) {
      console.error(`Failed to migrate config for canvas ${id}:`, error);
      // Skip invalid configs but continue migration
      continue;
    }
  }

  return migratedConfigs;
}

export function extractGlobalDefaults(
  legacyConfig: LegacyConfig
): Partial<CanvasConfig> {
  return {
    llm: {
      provider: legacyConfig.defaultProvider,
      modelId: legacyConfig.defaultModel,
      temperature: legacyConfig.temperature,
    },
    vectordb: {
      indexName: legacyConfig.vectordb?.indexName,
      cloud: legacyConfig.vectordb?.cloud,
      region: legacyConfig.vectordb?.region,
    },
  };
}