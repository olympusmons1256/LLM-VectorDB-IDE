// store/chat-store.ts
import { create } from 'zustand';
import type { Message } from '@/types/message';
import type { Plan } from '@/services/plans';
import type { CodeBlock, CodeAnnotation } from '@/types/code-block';
import type { LayoutMode } from '@/components/layout/types';
import type { VectorDBConfig } from '@/types/settings';
import type { SavedProject, ProjectState } from '@/types/save-state';
import { getActivePlans, updatePlan } from '@/services/plans';
import { useInitializationStore } from './initialization-store';

interface ChatState {
  // Configuration
  isConfigured: boolean;
  apiKeys: {
    anthropic?: string;
    openai?: string;
    voyage?: string;
    pinecone?: string;
  };
  vectorDBConfig: VectorDBConfig;
  
  // Project State
  currentNamespace: string;
  messages: Message[];
  activePlan: Plan | null;
  documents: {
    types: Record<string, number>;
    lastRefreshed?: string;
    selectedType?: string | null;
  };
  codeBlocks: CodeBlock[];
  annotations: CodeAnnotation[];
  
  // UI State
  isLoading: boolean;
  error: string | null;
  showSettings: boolean;
  sidebarOpen: boolean;
  layoutMode: LayoutMode;

  // Initialization
  initializeState: (config: { 
    apiKeys: ChatState['apiKeys'];
    vectorDBConfig: VectorDBConfig;
    namespace?: string;
    project?: SavedProject;
  }) => Promise<void>;
  
  // UI Actions
  setShowSettings: (show: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  
  // Configuration Actions
  setAPIKeys: (keys: ChatState['apiKeys']) => void;
  setVectorDBConfig: (config: VectorDBConfig) => void;
  setCurrentNamespace: (namespace: string) => Promise<void>;

  // Message Actions  
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, update: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;

  // Document Actions
  setDocuments: (documents: ChatState['documents']) => void;
  updateDocuments: (update: Partial<ChatState['documents']>) => void;
  refreshDocuments: (namespace: string) => Promise<void>;

  // Code Block Actions
  setCodeBlocks: (blocks: CodeBlock[]) => void;
  addCodeBlock: (block: CodeBlock) => void;
  updateCodeBlock: (id: string, update: Partial<CodeBlock>) => void;
  removeCodeBlock: (id: string) => void;

  // Annotation Actions
  setAnnotations: (annotations: CodeAnnotation[]) => void;
  addAnnotation: (annotation: CodeAnnotation) => void;
  
  // Plan Actions
  setActivePlan: (plan: Plan | null) => void;
  updatePlan: (update: Partial<Plan>) => void;

  // State Management
  clearState: () => void;
  loadProjectState: (project: SavedProject) => Promise<void>;
  getState: () => ProjectState;

  // Status Actions  
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  isConfigured: false,
  apiKeys: {},
  vectorDBConfig: {
    cloud: 'aws',
    region: 'us-east-1',
    indexName: ''
  },

  currentNamespace: '',
  messages: [],
  activePlan: null,
  documents: { types: {} },
  codeBlocks: [],
  annotations: [],

  isLoading: false,
  error: null,
  showSettings: false,
  sidebarOpen: true,
  layoutMode: 'default',

  // Initialization
  initializeState: async (config) => {
    const state = get();
    const initStore = useInitializationStore.getState();

    try {
      // Load configuration - config stage
      set({ 
        apiKeys: config.apiKeys,
        vectorDBConfig: config.vectorDBConfig,
        isConfigured: Boolean(
          config.apiKeys.pinecone &&
          config.apiKeys.voyage &&
          config.vectorDBConfig.indexName
        )
      });
      
      initStore.advanceStage(); // Move to documents stage

      // Initialize document system
      if (config.namespace) {
        await state.setCurrentNamespace(config.namespace);
      }

      initStore.advanceStage(); // Move to chat stage

      // Load project state
      if (config.project) {
        await state.loadProjectState(config.project);
      }

      initStore.advanceStage(); // Move to plans stage
      initStore.advanceStage(); // Move to complete stage
      
    } catch (error) {
      console.error('Error initializing chat store:', error);
      initStore.setError(error instanceof Error ? error.message : 'Failed to initialize');
      throw error;
    }
  },

  // UI Actions
  setShowSettings: (show) => set({ showSettings: show }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setLayoutMode: (mode) => set({ layoutMode: mode }),

  // Configuration Actions
  setAPIKeys: (keys) => set(state => ({
    apiKeys: keys,
    isConfigured: Boolean(
      keys.pinecone &&
      keys.voyage &&
      state.vectorDBConfig.indexName
    )
  })),

  setVectorDBConfig: (config) => set(state => ({
    vectorDBConfig: config,
    isConfigured: Boolean(
      state.apiKeys.pinecone &&
      state.apiKeys.voyage &&
      config.indexName
    )
  })),

  setCurrentNamespace: async (namespace) => {
    const state = get();
    
    try {
      set({ currentNamespace: namespace });
      
      // Only attempt to load documents if properly configured
      if (namespace && state.isConfigured) {
        await state.refreshDocuments(namespace);
      }
      
    } catch (error) {
      console.error('Error setting namespace:', error);
      state.setError('Failed to load namespace documents');
      throw error;
    }
  },

  // Message Actions  
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set(state => ({
    messages: [...state.messages, message]
  })),

  updateMessage: (id, update) => set(state => ({
    messages: state.messages.map(msg =>
      msg.id === id ? { ...msg, ...update } : msg
    )
  })),

  removeMessage: (id) => set(state => ({
    messages: state.messages.filter(msg => msg.id !== id)
  })),

  clearMessages: () => set({ messages: [] }),

  // Document Actions
  setDocuments: (documents) => set({ documents }),

  updateDocuments: (update) => set(state => ({
    documents: { ...state.documents, ...update }
  })),

  refreshDocuments: async (namespace) => {
    const state = get();
    if (!state.isConfigured || !namespace) return;

    try {
      state.setIsLoading(true);
      
      const response = await fetch('/api/vector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'query_context',
          config: {
            apiKeys: state.apiKeys,
            vectordb: state.vectorDBConfig,
            embedding: { provider: 'voyage' }
          },
          text: 'list all documents',
          namespace,
          filter: {
            $and: [
              { isComplete: { $eq: true } }
            ]
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh documents');
      }

      const data = await response.json();
      
      state.setDocuments({
        types: {},
        lastRefreshed: new Date().toISOString(),
        ...data
      });

    } catch (error: any) {
      console.error('Error refreshing documents:', error);
      state.setError(error.message);
    } finally {
      state.setIsLoading(false);
    }
  },

  // Code Block Actions
  setCodeBlocks: (blocks) => set({ codeBlocks: blocks }),
  
  addCodeBlock: (block) => set(state => ({
    codeBlocks: [...state.codeBlocks, block]
  })),

  updateCodeBlock: (id, update) => set(state => ({
    codeBlocks: state.codeBlocks.map(block =>
      block.id === id ? { ...block, ...update } : block
    )
  })),

  removeCodeBlock: (id) => set(state => ({
    codeBlocks: state.codeBlocks.filter(block => block.id !== id)
  })),

  // Annotation Actions
  setAnnotations: (annotations) => set({ annotations }),
  
  addAnnotation: (annotation) => set(state => ({
    annotations: [...state.annotations, annotation]
  })),
  
  // Plan Actions
  setActivePlan: (plan) => set({ activePlan: plan }),

  updatePlan: async (update) => {
    const state = get();
    if (!state.activePlan) return;

    const updatedPlan = { ...state.activePlan, ...update };
    
    try {
      await updatePlan(updatedPlan, {
        apiKeys: state.apiKeys,
        vectordb: state.vectorDBConfig,
        embedding: { provider: 'voyage' }
      });
      
      set({ activePlan: updatedPlan });
    } catch (error) {
      console.error('Error updating plan:', error);
      state.setError('Failed to update plan');
    }
  },

  // State Management
  clearState: () => set({
    messages: [],
    activePlan: null,
    documents: { types: {} },
    codeBlocks: [],
    annotations: [],
    error: null
  }),

  loadProjectState: async (project) => {
    const state = get();

    try {
      // Set namespace first if not already set
      if (project.metadata.namespace && project.metadata.namespace !== state.currentNamespace) {
        await state.setCurrentNamespace(project.metadata.namespace);
      }

      // Load state components
      set({
        messages: project.state.messages || [],
        activePlan: project.state.activePlan ? {
          ...project.state.activePlan,
          namespace: project.metadata.namespace
        } : null,
        codeBlocks: project.state.codeBlocks || [],
        annotations: project.state.annotations || [],
        error: null,
        isLoading: false
      });

    } catch (error) {
      console.error('Error loading project state:', error);
      throw error;
    }
  },

  getState: () => {
    const state = get();
    return {
      messages: state.messages,
      activePlan: state.activePlan,
      documents: state.documents,
      codeBlocks: state.codeBlocks,
      annotations: state.annotations
    };
  },

  // Status Actions
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error })
}));

// Export hooks for accessing store state
export const useCurrentProject = () => {
  const messages = useChatStore(state => state.messages);
  const activePlan = useChatStore(state => state.activePlan);
  return { messages, activePlan };
};

export const useMessages = () => useChatStore(state => state.messages);
export const useActivePlan = () => useChatStore(state => state.activePlan);
export const useDocuments = () => useChatStore(state => state.documents);
export const useCodeBlocks = () => useChatStore(state => state.codeBlocks);
export const useAnnotations = () => useChatStore(state => state.annotations);