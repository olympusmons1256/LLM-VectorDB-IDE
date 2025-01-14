import { LLMService } from './llm';
import { VectorService } from './vector';
import { useSettingsStore } from '../store/settings';
import type { CanvasConfig, LLMConfig, VectorDBConfig, EmbeddingConfig } from '../types/settings';

interface ServiceInstances {
  llm: LLMService;
  vector: VectorService;
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ServiceManager {
  private static instance: ServiceManager;
  private services: Map<string, ServiceInstances> = new Map();

  private constructor() {}

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  private validateConfig(config: CanvasConfig): void {
    if (!config) {
      throw new ConfigurationError('Canvas configuration is missing');
    }

    if (!config.vectordb?.apiKey) {
      throw new ConfigurationError('Vector DB API key is required');
    }
    if (!config.vectordb?.indexName || !config.vectordb?.cloud || !config.vectordb?.region) {
      throw new ConfigurationError('Vector DB configuration is incomplete');
    }

    if (!config.embedding?.apiKey) {
      throw new ConfigurationError('Embedding API key is required');
    }

    if (!config.llm?.apiKey) {
      throw new ConfigurationError('LLM API key is required');
    }
  }

  private createDefaultConfig(canvasId: string): CanvasConfig {
    return {
      id: canvasId,
      llm: {
        provider: 'anthropic',
        modelId: 'claude-3-sonnet-20240229',
        temperature: 0.7,
      },
      vectordb: {
        provider: 'pinecone',
        indexName: '',
        cloud: '',
        region: '',
        namespace: `canvas-${canvasId}`,
      },
      embedding: {
        provider: 'voyage',
      },
      planExecution: {
        defaultModel: {
          provider: 'anthropic',
          modelId: 'claude-3-sonnet-20240229',
        },
        autoExecute: false,
        maxSteps: 10,
      }
    };
  }

  private initializeServices(config: CanvasConfig): ServiceInstances {
    try {
      this.validateConfig(config);

      const llmService = new LLMService(config.llm);
      const vectorService = new VectorService(config.vectordb, config.embedding);

      return {
        llm: llmService,
        vector: vectorService
      };
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw new ConfigurationError('Failed to initialize services');
    }
  }

  getServices(canvasId: string): ServiceInstances {
    let instances = this.services.get(canvasId);
    
    if (!instances) {
      try {
        const settingsStore = useSettingsStore.getState();
        let config = settingsStore.getCanvasConfig(canvasId);
        
        if (!config) {
          config = this.createDefaultConfig(canvasId);
          settingsStore.updateCanvasConfig(canvasId, config);
        }
        
        instances = this.initializeServices(config);
        this.services.set(canvasId, instances);
      } catch (error) {
        if (error instanceof ConfigurationError) {
          throw error;
        }
        console.error(`Error initializing services for canvas ${canvasId}:`, error);
        throw new ConfigurationError('Service initialization failed');
      }
    }

    return instances;
  }

  async validateServices(canvasId: string): Promise<boolean> {
    try {
      const instances = this.getServices(canvasId);
      
      await instances.llm.testConnection();
      await instances.vector.testConnection();

      return true;
    } catch (error) {
      console.error('Service validation failed:', error);
      return false;
    }
  }

  updateServices(canvasId: string, config: CanvasConfig) {
    try {
      this.services.delete(canvasId);
      const instances = this.initializeServices(config);
      this.services.set(canvasId, instances);
      return instances;
    } catch (error) {
      console.error('Failed to update services:', error);
      throw new ConfigurationError('Failed to update services with new configuration');
    }
  }

  removeServices(canvasId: string) {
    this.services.delete(canvasId);
  }

  clearAllServices() {
    this.services.clear();
  }
}

export function useServices(canvasId: string) {
  const manager = ServiceManager.getInstance();
  
  try {
    const services = manager.getServices(canvasId);
    return {
      ...services,
      validate: () => manager.validateServices(canvasId),
      update: (config: Partial<CanvasConfig>) => manager.updateServices(canvasId, config as CanvasConfig),
      remove: () => manager.removeServices(canvasId)
    };
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    throw new ConfigurationError('Failed to access services');
  }
}

export function useServiceManager() {
  const manager = ServiceManager.getInstance();
  return {
    getServices: (canvasId: string) => manager.getServices(canvasId),
    validateServices: (canvasId: string) => manager.validateServices(canvasId),
    updateServices: (canvasId: string, config: CanvasConfig) => 
      manager.updateServices(canvasId, config),
    removeServices: (canvasId: string) => manager.removeServices(canvasId),
    clearAllServices: () => manager.clearAllServices()
  };
}