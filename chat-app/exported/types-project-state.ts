// types/project-state.ts

export interface DocumentState {
    namespace: string;
    loadedDocuments: {
      filename: string;
      content: string;
      metadata: {
        type: 'project-structure' | 'core-architecture' | 'code' | 'documentation' | 'plan';
        lastModified: string;
        size: number;
        language?: string;
        path?: string;
      };
    }[];
    documentTypes: Record<string, number>; // Count of each document type
    lastRefreshed: string;
  }
  
  export interface ChatState {
    messages: Message[];
    annotations: CodeAnnotation[];
    references: {
      messageId: string;
      blockIds: string[];
      planIds: string[];
    }[];
  }
  
  export interface CodeBlockState {
    blocks: {
      id: string;
      language: string;
      code: string;
      sourceType: 'chat' | 'document';
      sourceId: string;  // messageId or documentId
      metadata?: {
        filename?: string;
        path?: string;
        startLine?: number;
        endLine?: number;
      };
    }[];
    annotations: {
      blockId: string;
      messageId: string;
      text: string;
      line: number;
    }[];
  }
  
  export interface PlanState {
    activePlan: Plan | null;
    plans: Plan[];
    history: {
      planId: string;
      changes: {
        timestamp: string;
        type: 'status' | 'step' | 'metadata';
        authorId: string;
        details: string;
      }[];
    }[];
  }
  
  export interface WorkspaceState {
    documents: DocumentState;
    chat: ChatState;
    codeBlocks: CodeBlockState;
    plans: PlanState;
    metadata: {
      lastModified: string;
      modifiedBy: string;
      version: number;
    };
  }
  
  // store/state-manager.ts
  import { create } from 'zustand';
  import type { WorkspaceState } from '@/types/project-state';
  
  interface StateManager {
    // Current workspace state
    state: WorkspaceState | null;
    
    // Loading states
    isLoading: boolean;
    error: string | null;
  
    // Actions
    loadWorkspace: (projectId: string) => Promise<void>;
    saveWorkspace: () => Promise<void>;
    
    // Document actions
    updateDocuments: (documents: Partial<DocumentState>) => void;
    refreshDocuments: () => Promise<void>;
    
    // Chat actions
    updateMessages: (messages: Message[]) => void;
    addMessage: (message: Message) => void;
    
    // Code block actions
    updateCodeBlocks: (blocks: Partial<CodeBlockState>) => void;
    addCodeBlock: (block: CodeBlockState['blocks'][0]) => void;
    
    // Plan actions
    updatePlans: (plans: Partial<PlanState>) => void;
    setActivePlan: (plan: Plan | null) => void;
    
    // Utility functions
    validateState: () => boolean;
    getSerializableState: () => WorkspaceState;
  }
  
  export const useStateManager = create<StateManager>((set, get) => ({
    state: null,
    isLoading: false,
    error: null,
  
    loadWorkspace: async (projectId: string) => {
      const store = get();
      try {
        set({ isLoading: true, error: null });
        
        // Clear current state first
        store.state = null;
  
        // Load project from storage
        const project = await loadProjectFromStorage(projectId);
        if (!project) throw new Error('Project not found');
  
        // Initialize workspace state
        const workspaceState: WorkspaceState = {
          documents: project.state.documents,
          chat: project.state.chat,
          codeBlocks: project.state.codeBlocks,
          plans: project.state.plans,
          metadata: {
            lastModified: new Date().toISOString(),
            modifiedBy: 'current-user',
            version: project.metadata.version
          }
        };
  
        // Validate the loaded state
        if (!validateWorkspaceState(workspaceState)) {
          throw new Error('Invalid workspace state');
        }
  
        // Set the state
        set({ state: workspaceState });
  
        // Initialize necessary services
        await initializeServices(workspaceState.documents.namespace);
  
        console.log('Workspace loaded:', {
          projectId,
          namespace: workspaceState.documents.namespace,
          documentsCount: workspaceState.documents.loadedDocuments.length,
          messagesCount: workspaceState.chat.messages.length,
          plansCount: workspaceState.plans.plans.length
        });
  
      } catch (error) {
        console.error('Error loading workspace:', error);
        set({ error: error.message });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },
  
    saveWorkspace: async () => {
      const store = get();
      if (!store.state) throw new Error('No workspace loaded');
  
      try {
        set({ isLoading: true, error: null });
  
        // Update metadata
        store.state.metadata = {
          ...store.state.metadata,
          lastModified: new Date().toISOString(),
          version: store.state.metadata.version + 1
        };
  
        // Validate state before saving
        if (!store.validateState()) {
          throw new Error('Invalid workspace state');
        }
  
        // Get serializable state
        const serializableState = store.getSerializableState();
  
        // Save to storage
        await saveProjectToStorage(serializableState);
  
        console.log('Workspace saved:', {
          namespace: store.state.documents.namespace,
          version: store.state.metadata.version
        });
  
      } catch (error) {
        console.error('Error saving workspace:', error);
        set({ error: error.message });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },
  
    updateDocuments: (documents) => {
      set(state => ({
        state: state.state ? {
          ...state.state,
          documents: {
            ...state.state.documents,
            ...documents
          }
        } : null
      }));
    },
  
    refreshDocuments: async () => {
      const store = get();
      if (!store.state?.documents.namespace) return;
  
      try {
        set({ isLoading: true });
        
        // Refresh documents from vector store
        const documents = await fetchDocumentsFromVectorStore(
          store.state.documents.namespace
        );
  
        store.updateDocuments({
          loadedDocuments: documents,
          lastRefreshed: new Date().toISOString()
        });
  
      } catch (error) {
        console.error('Error refreshing documents:', error);
        set({ error: error.message });
      } finally {
        set({ isLoading: false });
      }
    },
  
    // ... implement other actions ...
  
    validateState: () => {
      const store = get();
      if (!store.state) return false;
  
      return (
        validateDocumentState(store.state.documents) &&
        validateChatState(store.state.chat) &&
        validateCodeBlockState(store.state.codeBlocks) &&
        validatePlanState(store.state.plans)
      );
    },
  
    getSerializableState: () => {
      const store = get();
      if (!store.state) throw new Error('No workspace loaded');
  
      // Create a deep copy and remove any non-serializable data
      return JSON.parse(JSON.stringify(store.state));
    }
  }));
  
  // Validation functions
  function validateWorkspaceState(state: WorkspaceState): boolean {
    return !!(
      state.documents?.namespace &&
      Array.isArray(state.documents.loadedDocuments) &&
      Array.isArray(state.chat.messages) &&
      Array.isArray(state.codeBlocks.blocks)
    );
  }
  
  function validateDocumentState(state: DocumentState): boolean {
    return !!(
      state.namespace &&
      Array.isArray(state.loadedDocuments) &&
      typeof state.documentTypes === 'object'
    );
  }
  
  // ... implement other validation functions ...
  
  // Service initialization
  async function initializeServices(namespace: string): Promise<void> {
    // Initialize vector store connection
    // Initialize any other required services
  }
  
  // Storage functions
  async function loadProjectFromStorage(projectId: string): Promise<any> {
    // Implement loading from IndexedDB or other storage
  }
  
  async function saveProjectToStorage(state: WorkspaceState): Promise<void> {
    // Implement saving to IndexedDB or other storage
  }