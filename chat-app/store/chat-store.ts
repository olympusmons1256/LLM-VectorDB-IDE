// store/chat-store.ts
import { create } from 'zustand';
import type { Message } from '@/types/message';
import type { Plan } from '@/services/plans';
import type { VectorDBConfig } from '@/types/settings';

const DEFAULT_CONFIG = {
  cloud: 'aws',
  region: 'us-east-1',
  indexName: 'chat-context'
};

interface ProjectState {
  messages: Message[];
  activePlan: Plan | null;
  documentTypes: Record<string, number>;
  lastRefreshed?: string;
}

interface ChatState {
  projects: Record<string, ProjectState>;
  currentNamespace: string;
  isLoading: boolean;
  error: string | null;
  showSettings: boolean;
  sidebarOpen: boolean;
  apiKeys: {
    anthropic?: string;
    openai?: string;
    voyage?: string;
    pinecone?: string;
  };
  vectorDBConfig: VectorDBConfig;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentNamespace: (namespace: string) => void;
  setShowSettings: (show: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setActivePlan: (plan: Plan | null) => void;
  setAPIKeys: (keys: ChatState['apiKeys']) => void;
  setVectorDBConfig: (config: VectorDBConfig) => void;
  refreshAll: (namespace: string) => Promise<void>;
}

const EMPTY_PROJECT: ProjectState = {
  messages: [],
  activePlan: null,
  documentTypes: {},
  lastRefreshed: new Date().toISOString()
};

const INITIAL_STATE = {
  projects: {} as Record<string, ProjectState>,
  currentNamespace: '',
  isLoading: false,
  error: null,
  showSettings: false,
  sidebarOpen: true,
  apiKeys: {},
  vectorDBConfig: DEFAULT_CONFIG,
};

export const useChatStore = create<ChatState>((set, get) => ({
  ...INITIAL_STATE,

  setMessages: (messages) => set(state => {
    const ns = state.currentNamespace;
    if (!ns) return state;
    
    return {
      projects: {
        ...state.projects,
        [ns]: {
          ...(state.projects[ns] || EMPTY_PROJECT),
          messages
        }
      }
    };
  }),

  addMessage: (message) => set(state => {
    const ns = state.currentNamespace;
    if (!ns) return state;
    
    const currentProject = state.projects[ns] || EMPTY_PROJECT;
    return {
      projects: {
        ...state.projects,
        [ns]: {
          ...currentProject,
          messages: [...currentProject.messages, message]
        }
      }
    };
  }),

  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  setCurrentNamespace: (namespace) => set(state => ({
    currentNamespace: namespace,
    projects: {
      ...state.projects,
      [namespace]: state.projects[namespace] || { ...EMPTY_PROJECT }
    }
  })),

  setShowSettings: (show) => set({ showSettings: show }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  setActivePlan: (plan) => set(state => {
    const ns = state.currentNamespace;
    if (!ns) return state;
    
    console.log('Setting active plan:', plan?.id);
    
    // Dispatch event for plan updates
    if (plan) {
      window.dispatchEvent(new CustomEvent('planUpdated'));
    }
    
    return {
      projects: {
        ...state.projects,
        [ns]: {
          ...(state.projects[ns] || EMPTY_PROJECT),
          activePlan: plan
        }
      }
    };
  }),

  setAPIKeys: (apiKeys) => set({ apiKeys }),
  setVectorDBConfig: (config) => set({ vectorDBConfig: config }),

  refreshAll: async (namespace) => {
    if (!namespace) return;
    set({ isLoading: true });
    try {
      // Trigger refresh events
      window.dispatchEvent(new CustomEvent('planUpdated'));
      
      set(state => ({
        projects: {
          ...state.projects,
          [namespace]: {
            ...(state.projects[namespace] || EMPTY_PROJECT),
            lastRefreshed: new Date().toISOString()
          }
        },
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  }
}));

// Custom hooks for easier access to project state
export const useCurrentProject = () => {
  return useChatStore(state => state.projects[state.currentNamespace] || EMPTY_PROJECT);
};

export const useMessages = () => {
  return useChatStore(state => 
    state.projects[state.currentNamespace]?.messages || EMPTY_PROJECT.messages
  );
};

export const useActivePlan = () => {
  return useChatStore(state => 
    state.projects[state.currentNamespace]?.activePlan || EMPTY_PROJECT.activePlan
  );
};

export const useNamespaceState = (namespace: string) => {
  return useChatStore(state => state.projects[namespace] || EMPTY_PROJECT);
};