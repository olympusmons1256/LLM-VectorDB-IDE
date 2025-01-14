// store/state-manager.ts
import { create } from 'zustand';
import { WorkspaceStorage } from '@/storage/workspace-storage';
import type { 
  WorkspaceState, 
  DocumentState, 
  ChatState, 
  CodeBlockState, 
  PlanState,
  WorkspaceValidationError,
  WorkspaceMetadata 
} from '@/types/workspace-state';
import type { Message } from '@/types/message';
import type { Plan } from '@/services/plans';
import type { CodeBlock } from '@/types/code-block';
import { useChatStore } from './chat-store';
import { useSaveStateStore } from './save-state-store';

// State manager interface
interface StateManager {
  // State
  state: WorkspaceState | null;
  isLoading: boolean;
  error: string | null;
  lastOperation: string | null;
  validationErrors: WorkspaceValidationError[];

  // Workspace operations
  loadWorkspace: (projectId: string) => Promise<void>;
  saveWorkspace: () => Promise<void>;
  createWorkspace: (name: string, namespace: string) => Promise<string>;
  deleteWorkspace: (id: string) => Promise<void>;
  
  // Document operations
  updateDocuments: (documents: Partial<DocumentState>) => void;
  refreshDocuments: () => Promise<void>;
  addDocument: (filename: string, content: string, type: DocumentState['loadedDocuments'][0]['metadata']['type']) => void;
  removeDocument: (filename: string) => void;
  
  // Chat operations
  updateMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessageAnnotations: (messageId: string, annotations: string[]) => void;
  
  // Code block operations
  updateCodeBlocks: (blocks: Partial<CodeBlockState>) => void;
  addCodeBlock: (block: CodeBlock) => void;
  updateCodeBlockAnnotations: (blockId: string, annotations: CodeBlockState['annotations']) => void;
  removeCodeBlock: (blockId: string) => void;
  
  // Plan operations
  updatePlans: (plans: Partial<PlanState>) => void;
  setActivePlan: (plan: Plan | null) => void;
  addPlanStep: (planId: string, step: Plan['steps'][0]) => void;
  updatePlanStatus: (planId: string, status: Plan['status']) => void;
  
  // Utility operations
  validateState: () => WorkspaceValidationError[];
  getSerializableState: () => WorkspaceState;
  resetState: () => void;
  mergeState: (partialState: Partial<WorkspaceState>) => void;
}

// Initialize the storage instance
const storage = WorkspaceStorage.getInstance();

// Create the state manager store
export const useStateManager = create<StateManager>((set, get) => ({
  // Initial state
  state: null,
  isLoading: false,
  error: null,
  lastOperation: null,
  validationErrors: [],

  // Workspace operations
  loadWorkspace: async (projectId: string) => {
    try {
      set({ isLoading: true, error: null, lastOperation: 'load' });
      
      // Initialize storage
      await storage.initialize();
      
      // Load workspace
      const { state: workspaceState } = await storage.loadWorkspace(projectId);
      
      // Validate loaded state
      const errors = validateWorkspaceState(workspaceState);
      if (errors.length > 0) {
        set({ validationErrors: errors });
        throw new Error('Invalid workspace state');
      }
      
      // Set state
      set({ 
        state: workspaceState,
        validationErrors: []
      });

      // Update related stores
      const chatStore = useChatStore.getState();
      await chatStore.setCurrentNamespace(workspaceState.documents.namespace);

      const saveStore = useSaveStateStore.getState();
      saveStore.setActiveProject(projectId);

      console.log('Workspace loaded successfully:', {
        id: projectId,
        namespace: workspaceState.documents.namespace,
        version: workspaceState.metadata.version
      });

    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false, lastOperation: null });
    }
  },

  saveWorkspace: async () => {
    const { state } = get();
    
    if (!state) {
      throw new Error('No workspace loaded');
    }

    try {
      set({ isLoading: true, error: null, lastOperation: 'save' });

      // Validate state before saving
      const errors = validateWorkspaceState(state);
      if (errors.length > 0) {
        set({ validationErrors: errors });
        throw new Error('Invalid workspace state');
      }

      // Get serializable state
      const serializableState = get().getSerializableState();

      // Update metadata
      const metadata: WorkspaceMetadata = {
        name: state.metadata.name,
        owner: state.metadata.owner,
        namespace: state.documents.namespace,
        version: state.metadata.version + 1,
        created: state.metadata.created,
        updated: new Date().toISOString()
      };

      // Save workspace
      await storage.saveWorkspace(
        state.metadata.id,
        serializableState,
        metadata
      );

      // Update version in current state
      set(state => ({
        state: state.state ? {
          ...state.state,
          metadata: {
            ...state.state.metadata,
            version: metadata.version,
            lastModified: metadata.updated
          }
        } : null,
        validationErrors: []
      }));

      // Update save state store
      const saveStore = useSaveStateStore.getState();
      saveStore.setPendingChanges(false);

      console.log('Workspace saved successfully:', {
        id: state.metadata.id,
        namespace: state.documents.namespace,
        version: metadata.version
      });

    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false, lastOperation: null });
    }
  },

  createWorkspace: async (name: string, namespace: string) => {
    try {
      set({ isLoading: true, error: null, lastOperation: 'create' });

      const newState: WorkspaceState = createInitialWorkspaceState(name, namespace);

      // Validate new state
      const errors = validateWorkspaceState(newState);
      if (errors.length > 0) {
        set({ validationErrors: errors });
        throw new Error('Invalid workspace state');
      }

      // Save new workspace
      await storage.saveWorkspace(
        newState.metadata.id,
        newState,
        {
          name,
          owner: getCurrentUser(),
          namespace,
          version: 1,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }
      );

      // Set as current state
      set({ 
        state: newState,
        validationErrors: []
      });

      return newState.metadata.id;

    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false, lastOperation: null });
    }
  },

  deleteWorkspace: async (id: string) => {
    try {
      set({ isLoading: true, error: null, lastOperation: 'delete' });

      await storage.deleteWorkspace(id);

      if (get().state?.metadata.id === id) {
        get().resetState();
        
        // Update related stores
        const chatStore = useChatStore.getState();
        chatStore.clearState();
        
        const saveStore = useSaveStateStore.getState();
        saveStore.setActiveProject(null);
      }

      console.log('Workspace deleted successfully:', { id });

    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false, lastOperation: null });
    }
  },

  // Document operations
  updateDocuments: (documents) => {
    set(state => ({
      state: state.state ? {
        ...state.state,
        documents: {
          ...state.state.documents,
          ...documents,
          lastRefreshed: new Date().toISOString()
        }
      } : null
    }));
  },

  refreshDocuments: async () => {
    const { state } = get();
    if (!state?.documents.namespace) return;

    try {
      set({ isLoading: true, lastOperation: 'refresh-documents' });
      
      // Refresh documents from vector store
      const response = await fetch('/api/vector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'query_context',
          namespace: state.documents.namespace,
          text: 'list all documents'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh documents');
      }

      const data = await response.json();
      
      get().updateDocuments({
        loadedDocuments: data.matches || [],
        lastRefreshed: new Date().toISOString()
      });

      console.log('Documents refreshed successfully:', {
        namespace: state.documents.namespace,
        count: data.matches?.length || 0
      });

    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false, lastOperation: null });
    }
  },

  addDocument,
  removeDocument,
  updateMessages,
  addMessage,
  updateMessageAnnotations,
  updateCodeBlocks,
  addCodeBlock,
  updateCodeBlockAnnotations,
  removeCodeBlock,
  updatePlans,
  setActivePlan,
  addPlanStep,
  updatePlanStatus,

  // Utility operations
  validateState: () => {
    const { state } = get();
    if (!state) return [];
    return validateWorkspaceState(state);
  },

  getSerializableState: () => {
    const { state } = get();
    if (!state) throw new Error('No workspace loaded');
    return JSON.parse(JSON.stringify(state));
  },

  resetState: () => {
    set({ 
      state: null, 
      error: null,
      lastOperation: null,
      validationErrors: []
    });
  },

  mergeState: (partialState) => {
    set(state => ({
      state: state.state ? {
        ...state.state,
        ...partialState,
        metadata: {
          ...state.state.metadata,
          lastModified: new Date().toISOString()
        }
      } : null
    }));
  }
}));

// Utility functions
function createInitialWorkspaceState(name: string, namespace: string): WorkspaceState {
  return {
    documents: {
      namespace,
      loadedDocuments: [],
      documentTypes: {},
      lastRefreshed: new Date().toISOString()
    },
    chat: {
      messages: [],
      annotations: [],
      references: []
    },
    codeBlocks: {
      blocks: [],
      annotations: []
    },
    plans: {
      activePlan: null,
      plans: [],
      history: []
    },
    metadata: {
      id: `workspace-${Date.now()}`,
      name,
      owner: getCurrentUser(),
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      modifiedBy: getCurrentUser(),
      version: 1
    }
  };
}

function validateWorkspaceState(state: WorkspaceState): WorkspaceValidationError[] {
  const errors: WorkspaceValidationError[] = [];

  // Validate documents
  if (!state.documents.namespace) {
    errors.push({ field: 'documents.namespace', error: 'Namespace is required' });
  }
  if (!Array.isArray(state.documents.loadedDocuments)) {
    errors.push({ field: 'documents.loadedDocuments', error: 'Must be an array' });
  }

  // Validate chat
  if (!Array.isArray(state.chat.messages)) {
    errors.push({ field: 'chat.messages', error: 'Must be an array' });
  }
  if (!Array.isArray(state.chat.annotations)) {
    errors.push({ field: 'chat.annotations', error: 'Must be an array' });
  }

  // Validate code blocks
  if (!Array.isArray(state.codeBlocks.blocks)) {
    errors.push({ field: 'codeBlocks.blocks', error: 'Must be an array' });
  }
  if (!Array.isArray(state.codeBlocks.annotations)) {
    errors.push({ field: 'codeBlocks.annotations', error: 'Must be an array' });
  }

  // Validate plans
  if (!Array.isArray(state.plans.plans)) {
    errors.push({ field: 'plans.plans', error: 'Must be an array' });
  }
  if (!Array.isArray(state.plans.history)) {
    errors.push({ field: 'plans.history', error: 'Must be an array' });
  }

  // Validate metadata
  if (!state.metadata.lastModified) {
    errors.push({ field: 'metadata.lastModified', error: 'Last modified timestamp is required' });
  }
  if (!state.metadata.modifiedBy) {
    errors.push({ field: 'metadata.modifiedBy', error: 'Modified by is required' });
  }
  if (typeof state.metadata.version !== 'number') {
    errors.push({ field: 'metadata.version', error: 'Version must be a number' });
  }

  return errors;
}

function getCurrentUser(): string {
  const saveStore = useSaveStateStore.getState();
  return saveStore.currentUser?.id || 'unknown-user';
}

// Helper function implementations
function addDocument(filename: string, content: string, type: DocumentState['loadedDocuments'][0]['metadata']['type']) {
  set(state => ({
    state: state.state ? {
      ...state.state,
      documents: {
        ...state.state.documents,
        loadedDocuments: [
          ...state.state.documents.loadedDocuments,
          {
            filename,
            content,
            metadata: {
              type,
              lastModified: new Date().toISOString(),
              size: new TextEncoder().encode(content).length
            }
          }
        ]
      }
    } : null
  }));
}

function removeDocument(filename: string) {
  set(state => ({
    state: state.state ? {
      ...state.state,
      documents: {
        ...state.state.documents,
        loadedDocuments: state.state.documents.loadedDocuments.filter(
          doc => doc.filename !== filename
        )
      }
    } : null
  }));
}