// src/utils/settings-validation.ts
import type { 
  CanvasConfig, 
  LLMConfig, 
  VectorDBConfig, 
  EmbeddingConfig, 
  PlanExecutionConfig,
  MODEL_OPTIONS 
} from '../types/settings';

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export async function validateLLMConfig(config: LLMConfig): Promise<boolean> {
  if (!config.provider || !config.modelId) {
    throw new ConfigurationError('LLM provider and model ID are required');
  }

  const validModel = MODEL_OPTIONS.some(
    model => model.provider === config.provider && model.id === config.modelId
  );
  
  if (!validModel) {
    throw new ConfigurationError('Invalid model selection');
  }

  if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 1) {
    throw new ConfigurationError('Temperature must be between 0 and 1');
  }

  return true;
}

export async function validateVectorDBConfig(config: VectorDBConfig): Promise<boolean> {
  if (config.provider !== 'pinecone') {
    throw new ConfigurationError('Only Pinecone is supported as vector DB provider');
  }

  if (!config.indexName || !config.cloud || !config.region) {
    throw new ConfigurationError('Vector DB configuration is incomplete');
  }

  if (!config.namespace) {
    throw new ConfigurationError('Vector DB namespace is required');
  }

  return true;
}

export async function validateEmbeddingConfig(config: EmbeddingConfig): Promise<boolean> {
  if (config.provider !== 'voyage') {
    throw new ConfigurationError('Only Voyage is supported as embedding provider');
  }

  return true;
}

export async function validatePlanConfig(config: PlanExecutionConfig): Promise<boolean> {
  if (!config.defaultModel.provider || !config.defaultModel.modelId) {
    throw new ConfigurationError('Plan execution model configuration is required');
  }

  const validModel = MODEL_OPTIONS.some(
    model => 
      model.provider === config.defaultModel.provider && 
      model.id === config.defaultModel.modelId
  );

  if (!validModel) {
    throw new ConfigurationError('Invalid plan execution model');
  }

  if (config.maxSteps < 1) {
    throw new ConfigurationError('Max steps must be greater than 0');
  }

  return true;
}

export async function validateCanvasConfig(config: CanvasConfig): Promise<boolean> {
  try {
    if (!config.id) {
      throw new ConfigurationError('Canvas ID is required');
    }

    await Promise.all([
      validateLLMConfig(config.llm),
      validateVectorDBConfig(config.vectordb),
      validateEmbeddingConfig(config.embedding),
      validatePlanConfig(config.planExecution),
    ]);

    return true;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    throw new ConfigurationError('Configuration validation failed');
  }
}