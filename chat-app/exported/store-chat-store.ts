// store/chat-store.ts
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from '@/types/message';
import type { Plan } from '@/services/plans';
import type { CodeBlock, CodeAnnotation } from '@/types/code-block';
import type { LayoutMode } from '@/components/layout/types';
import type { VectorDBConfig } from '@/types/settings';

export type ChatEvent = {
  type: 'message_added' | 'state_cleared' | 'state_loaded' | 'error_occurred';
  payload?: any;
  timestamp: number;
};

export interface ProjectState {
  messages: Message[];
  activePlan: Plan | null;
  documents: {
    types: Record<string, number>;
    lastRefreshed?: string;
  };
  codeBlocks: CodeBlock[];
  annotations: CodeAnnotation[];
  metadata?: {
    lastModified: string;
    modifiedBy: string;
  };
}

interface ChatState {
  // Configuration
  config: any;
  isConfigured: boolean;
  apiKeys: {
    anthropic?: string;
    openai?: string;
    voyage?: string;
    pinecone?: string;
  };
  vectorDBConfig: VectorDBConfig;

  // Project State
  projects: Record<string, any>;
  currentNamespace: string;
  messages: Message[];
  activePlan: Plan | null;
  documents: {
    types: Record<string, number>;
    lastRefreshed?: string;
  };
  codeBlocks: CodeBlock[];
  annotations: CodeAnnotation[];
  eventLog: ChatEvent[];
  pendingChanges: boolean;
  lastSaved: string | null;

  // Loading States
  isLoading: boolean;
  error: string | null;
  lastError: Error | null;

  // UI State
  showSettings: boolean;
  sidebarOpen: boolean;
  layoutMode: LayoutMode;

  // Actions
  setShowSettings: (show: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setCurrentNamespace: (namespace: string) => void;
  
  // Configuration Actions
  setAPIKeys: (keys: ChatState['apiKeys']) => void;
  setVectorDBConfig: (config: VectorDBConfig) => void;
  
  // Message Management
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, update: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  
  // Plan Management
  setActivePlan: (plan: Plan | null) => void;
  updatePlan: (update: Partial<Plan>) => void;
  
  // Document Management
  setDocuments: (documents: ChatState['documents']) => void;
  updateDocuments: (update: Partial<ChatState['documents']>) => void;
  refreshDocuments: (namespace: string) => Promise<void>;
  
  // Code & Annotation Management
  setCodeBlocks: (blocks: CodeBlock[]) => void;
  addCodeBlock: (block: CodeBlock) => void;
  updateCodeBlock: (id: string, update: Partial<CodeBlock>) => void;
  removeCodeBlock: (id: string) => void;
  setAnnotations: (annotations: CodeAnnotation[]) => void;
  addAnnotation: (annotation: CodeAnnotation) => void;
  
  // State Management
  clearState: () => void;
  loadState: (projectId: string) => Promise<void>;
  getState: () => ProjectState;
  validateState: () => boolean;
  
  // Error Handling
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logError: (error: Error) => void;
  clearError: () => void;
  
  // Event Logging
  logEvent: (event: Omit<ChatEvent, 'timestamp'>) => void;
  getEvents: (since?: number) => ChatEvent[];
  clearEvents: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial Configuration
  config: null,
  isConfigured: false,
  apiKeys: {},
  vectorDBConfig: {
    cloud: 'aws',
    region: 'us-east-1',
    indexName: ''
  },

  // Initial Project State
  projects: {},
  currentNamespace: '',
  messages: [],
  activePlan: null,
  documents: { types: {} },
  codeBlocks: [],
  annotations: [],
  eventLog: [],
  pendingChanges: false,
  lastSaved: null,

  // Initial Loading States
  isLoading: false,
  error: null,
  lastError: null,

  // Initial UI State
  showSettings: false,
  sidebarOpen: true,
  layoutMode: 'default',

  // UI Actions
  setShowSettings: (show) => set({ showSettings: show }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setLayoutMode: (mode) => set({ layoutMode: mode }),

  // Configuration Actions
  setAPIKeys: (keys) => {
    console.log('Setting API keys');
    set({ apiKeys: keys, isConfigured: true });
  },
  setVectorDBConfig: (config) => {
    console.log('Setting vector DB config:', config);
    set({ vectorDBConfig: config });
  },
  
  // Namespace Management
  setCurrentNamespace: async (namespace) => {
    console.log('Setting current namespace:', namespace);
    set({ currentNamespace: namespace });
    
    if (namespace) {
      try {
        await get().refreshDocuments(namespace);
      } catch (error) {
        console.error('Error refreshing documents for namespace:', error);
        get().setError('Failed to load namespace documents. Some features may be limited.');
      }
    }
    
    get().logEvent({ type: 'state_loaded', payload: { namespace } });
  },

  // Message Management
  setMessages: (messages) => {
    console.log('Setting messages:', messages.length);
    set({ messages, pendingChanges: true });
  },
  
  addMessage: (message) => {
    const messageWithId = { ...message, id: message.id || uuidv4() };
    console.log('Adding message:', messageWithId.id);
    set(state => ({ 
      messages: [...state.messages, messageWithId],
      pendingChanges: true
    }));
    get().logEvent({ type: 'message_added', payload: { messageId: messageWithId.id } });
  },

  updateMessage: (id, update) => {
    console.log('Updating message:', id);
    set(state => ({
      messages: state.messages.map(msg => 
        msg.id === id ? { ...msg, ...update } : msg
      ),
      pendingChanges: true
    }));
  },

  removeMessage: (id) => {
    console.log('Removing message:', id);
    set(state => ({
      messages: state.messages.filter(msg => msg.id !== id),
      pendingChanges: true
    }));
  },

  clearMessages: () => {
    console.log('Clearing all messages');
    set({ messages: [], pendingChanges: true });
  },

  // Plan Management
  setActivePlan: (plan) => {
    console.log('Setting active plan:', plan?.id);
    set({ 
      activePlan: plan,
      pendingChanges: true
    });
  },

  updatePlan: (update) => {
    console.log('Updating plan:', update);
    set(state => ({
      activePlan: state.activePlan ? { ...state.activePlan, ...update } : null,
      pendingChanges: true
    }));
  },

  // Document Management
  setDocuments: (documents) => {
    console.log('Setting documents:', documents);
    set({ documents });
  },

  updateDocuments: (update) => {
    console.log('Updating documents:', update);
    set(state => ({
      documents: { ...state.documents, ...update }
    }));
  },

  refreshDocuments: async (namespace) => {
    console.log('Refreshing documents for namespace:', namespace);
    const state = get();
    if (!namespace) return;

    state.setIsLoading(true);
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(`Refresh attempt ${retryCount + 1} of ${maxRetries}`);
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
          throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();
        console.log('Documents refreshed:', data);
        state.setDocuments({ types: {}, ...data });
        state.setIsLoading(false);
        return;

      } catch (error) {
        console.error(`Refresh attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        if (retryCount === maxRetries) {
          state.setError(`Failed to refresh documents after ${maxRetries} attempts`);
          state.setIsLoading(false);
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  },

  // Code Block Management
  setCodeBlocks: (blocks) => {
    console.log('Setting code blocks:', blocks.length);
    set({ codeBlocks: blocks });
  },

  addCodeBlock: (block) => {
    console.log('Adding code block:', block.id);
    set(state => ({
      codeBlocks: [...state.codeBlocks, block],
      pendingChanges: true
    }));
  },

  updateCodeBlock: (id, update) => {
    console.log('Updating code block:', id);
    set(state => ({
      codeBlocks: state.codeBlocks.map(block => 
        block.id === id ? { ...block, ...update } : block
      ),
      pendingChanges: true
    }));
  },

  removeCodeBlock: (id) => {
    console.log('Removing code block:', id);
    set(state => ({
      codeBlocks: state.codeBlocks.filter(block => block.id !== id),
      pendingChanges: true
    }));
  },

  // Annotation Management
  setAnnotations: (annotations) => {
    console.log('Setting annotations:', annotations.length);
    set({ annotations });
  },

  addAnnotation: (annotation) => {
    console.log('Adding annotation:', annotation);
    set(state => ({
      annotations: [...state.annotations, annotation],
      pendingChanges: true
    }));
  },

  // State Management
  clearState: () => {
    console.log('Clearing project state');
    set({
      messages: [],
      activePlan: null,
      documents: { types: {} },
      codeBlocks: [],
      annotations: [],
      error: null,
      pendingChanges: false,
      lastSaved: null
    });
    get().logEvent({ type: 'state_cleared' });
  },

  loadState: async (projectId) => {
    console.log('Loading project state:', projectId);
    try {
      const state = get();
      const project = state.projects[projectId];
      
      if (!project) {
        throw new Error('Project not found');
      }

      if (project.metadata.namespace) {
        await state.setCurrentNamespace(project.metadata.namespace);
      }

      set({
        messages: project.state.messages || [],
        activePlan: project.state.activePlan,
        documents: project.state.documents || { types: {} },
        codeBlocks: project.state.codeBlocks || [],
        annotations: project.state.annotations || [],
        error: null,
        isLoading: false,
        pendingChanges: false
      });

      get().logEvent({ 
        type: 'state_loaded', 
        payload: { 
          projectId,
          namespace: project.metadata.namespace
        } 
      });

    } catch (error) {
      console.error('Error loading project state:', error);
      get().logError(error as Error);
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
      annotations: state.annotations,
      metadata: {
        lastModified: new Date().toISOString(),
        modifiedBy: 'current-user'
      }
    };
  },

  validateState: () => {
    const state = get().getState();
    return Boolean(
      Array.isArray(state.messages) &&
      Array.isArray(state.codeBlocks) &&
      Array.isArray(state.annotations) &&
      state.documents?.types !== undefined
    );
  },

  // Error Handling
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => {
    console.log('Setting error:', error);
    set({ error });
  },
  
  logError: (error: Error) => {
    console.error('Chat store error:', error);
    set({ 
      lastError: error,
      error: error.message 
    });
    get().logEvent({ type: 'error_occurred', payload: { error: error.message } });
  },
  
  clearError: () => {
    console.log('Clearing error state');
    set({ error: null, lastError: null });
  },

  // Event Logging
  logEvent: (event) => {
    console.log('Logging event:', event.type);
    set(state => ({
      eventLog: [...state.eventLog, { ...event, timestamp: Date.now() }]
    }));
  },
  
  getEvents: (since = 0) => get().eventLog.filter(event => event.timestamp > since),
  
  clearEvents: () => {
    console.log('Clearing event log');
    set({ eventLog: [] });
  }
}));

// Custom hooks for easier state access
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

export const useHasChanges = () => {
  const state = useChatStore.getState();
  return state.pendingChanges;
};