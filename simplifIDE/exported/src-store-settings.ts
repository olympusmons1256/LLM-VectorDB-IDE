// src/store/settings.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { SettingsState, CanvasConfig } from '../types/settings';
import { validateCanvasConfig } from '../utils/settings-validation';

const DEFAULT_CONFIG: Omit<CanvasConfig, 'id'> = {
  llm: {
    provider: 'anthropic',
    modelId: 'claude-3-sonnet-20240229',
    temperature: 0.7
  },
  vectordb: {
    provider: 'pinecone',
    indexName: '',
    cloud: 'aws',
    region: 'us-east-1',
    namespace: ''
  },
  embedding: {
    provider: 'voyage'
  },
  planExecution: {
    defaultModel: {
      provider: 'anthropic',
      modelId: 'claude-3-sonnet-20240229'
    },
    autoExecute: false,
    maxSteps: 10
  }
};

interface SettingsActions {
  createCanvas: () => Promise<string>;
  setActiveCanvas: (canvasId: string | null) => void;
  updateCanvasConfig: (canvasId: string, updates: Partial<CanvasConfig>) => Promise<void>;
  updateGlobalDefaults: (updates: Partial<CanvasConfig>) => void;
  deleteCanvas: (canvasId: string) => void;
  getCanvasConfig: (canvasId: string) => CanvasConfig | null;
  getNamespace: (canvasId: string) => string;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set, get) => ({
      canvasConfigs: {},
      globalDefaults: {},
      activeCanvasId: null,

      createCanvas: async () => {
        const id = nanoid();
        const { globalDefaults } = get();
        
        const newConfig: CanvasConfig = {
          ...DEFAULT_CONFIG,
          id,
          vectordb: {
            ...DEFAULT_CONFIG.vectordb,
            namespace: `canvas-${id}`
          },
          ...globalDefaults
        };

        await validateCanvasConfig(newConfig);

        set((state) => ({
          canvasConfigs: {
            ...state.canvasConfigs,
            [id]: newConfig,
          },
          activeCanvasId: id,
        }));

        return id;
      },

      setActiveCanvas: (canvasId) => {
        set({ activeCanvasId: canvasId });
      },

      updateCanvasConfig: async (canvasId, updates) => {
        const current = get().canvasConfigs[canvasId];
        if (!current) return;

        const updatedConfig = {
          ...current,
          ...updates,
          vectordb: {
            ...current.vectordb,
            ...updates.vectordb,
            namespace: `canvas-${canvasId}`
          }
        };

        await validateCanvasConfig(updatedConfig);

        set((state) => ({
          canvasConfigs: {
            ...state.canvasConfigs,
            [canvasId]: updatedConfig,
          },
        }));
      },

      updateGlobalDefaults: (updates) => {
        set((state) => ({
          globalDefaults: {
            ...state.globalDefaults,
            ...updates,
          },
        }));
      },

      deleteCanvas: (canvasId) => {
        set((state) => {
          const { [canvasId]: _, ...remainingConfigs } = state.canvasConfigs;
          return {
            canvasConfigs: remainingConfigs,
            activeCanvasId: state.activeCanvasId === canvasId ? null : state.activeCanvasId,
          };
        });
      },

      getCanvasConfig: (canvasId) => {
        return get().canvasConfigs[canvasId] || null;
      },

      getNamespace: (canvasId) => `canvas-${canvasId}`,
    }),
    {
      name: 'canvas-settings',
      partialize: (state) => ({
        canvasConfigs: state.canvasConfigs,
        globalDefaults: state.globalDefaults,
      }),
    }
  )
);

// Helper hooks for common settings operations
export function useCanvasSettings(canvasId: string) {
  return useSettingsStore(state => ({
    config: state.getCanvasConfig(canvasId),
    updateConfig: state.updateCanvasConfig,
    namespace: state.getNamespace(canvasId),
  }));
}

export function useGlobalSettings() {
  return useSettingsStore(state => ({
    defaults: state.globalDefaults,
    updateDefaults: state.updateGlobalDefaults,
  }));
}