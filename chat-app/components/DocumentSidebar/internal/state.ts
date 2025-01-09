// components/DocumentSidebar/internal/state.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { REFRESH_INTERVAL, REFRESH_COOLDOWN, MAX_CHUNK_SIZE } from './constants';
import type { EmbeddingConfig } from '@/services/embedding';
import type { IndexedDocument, NamespaceStats, LoadingState, WorkspaceValidationError } from './types';
import { debounce } from '@/lib/utils';
import { useChatStore } from '@/store/chat-store';

interface DocumentSidebarState {
  // Configuration
  config: EmbeddingConfig | null;
  isConfigured: boolean;
  isLoading: boolean;
  loadingState: LoadingState;
  lastRefreshTime: number;
  lastError: string | null;
  activeRequest: AbortController | null;
  sidebarVisible: boolean;

  // State
  documents: Record<string, IndexedDocument[]>;
  namespaces: Record<string, NamespaceStats>;
  currentNamespace: string;
  selectedType: string | null;
  sortOrder: 'asc' | 'desc';
  validationErrors: WorkspaceValidationError[];

  // Actions
  initialize: (config: EmbeddingConfig) => void;
  setLoadingState: (state: LoadingState) => void;
  setDocuments: (namespace: string, docs: IndexedDocument[]) => void;
  updateDocument: (namespace: string, filename: string, update: Partial<IndexedDocument>) => void;
  setNamespaces: (namespaces: Record<string, NamespaceStats>) => void;
  setSelectedType: (type: string | null) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setSidebarVisible: (visible: boolean) => void;
  setError: (error: string | null) => void;
  
  // Operations
  refreshNamespaces: () => Promise<void>;
  refreshDocuments: (namespace: string) => Promise<void>;
  refreshAll: (namespace: string) => Promise<void>;
  ensureNamespace: (namespace: string) => Promise<void>;
  deleteNamespace: (namespace: string) => Promise<void>;
  processDocument: (file: File, namespace: string) => Promise<void>;
  clearNamespaceData: (namespace: string) => void;
  validateState: () => WorkspaceValidationError[];
}

export const useDocumentSidebarState = create<DocumentSidebarState>()(
  persist(
    (set, get) => ({
      // Initial state
      config: null,
      isConfigured: false,
      isLoading: false,
      loadingState: { isLoading: false, status: '' },
      lastRefreshTime: 0,
      lastError: null,
      activeRequest: null,
      documents: {},
      namespaces: {},
      currentNamespace: '',
      selectedType: null,
      sortOrder: 'desc',
      sidebarVisible: true,
      validationErrors: [],

      initialize: (config) => {
        const isConfigValid = Boolean(
          config?.apiKeys?.pinecone &&
          config?.vectordb?.indexName
        );

        set({ 
          config, 
          isConfigured: isConfigValid,
          loadingState: { isLoading: false, status: '' }
        });

        // Initial namespace refresh if configured
        if (isConfigValid) {
          get().refreshNamespaces().catch(error => {
            console.error('Error in initial refresh:', error);
            set({ lastError: error.message });
          });
        }
      },

      setLoadingState: (loadingState) => set({ loadingState }),
      
      setDocuments: (namespace, docs) => set(state => ({
        documents: { ...state.documents, [namespace]: docs },
        lastRefreshTime: Date.now()
      })),

      updateDocument: (namespace, filename, update) => set(state => ({
        documents: {
          ...state.documents,
          [namespace]: state.documents[namespace]?.map(doc =>
            doc.metadata?.filename === filename ? { ...doc, ...update } : doc
          ) || []
        }
      })),
      
      setNamespaces: (namespaces) => set({ namespaces }),

      setSelectedType: (selectedType) => set({ selectedType }),

      setSortOrder: (sortOrder) => set({ sortOrder }),

      setSidebarVisible: (visible) => set({ sidebarVisible: visible }),

      setError: (error) => set({ lastError: error }),

      refreshNamespaces: async () => {
        const state = get();
        if (!state.config || !state.isConfigured) return;

        try {
          set({ loadingState: { isLoading: true, status: 'Fetching namespaces...' } });

          const response = await fetch('/api/vector', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'list_namespaces',
              config: state.config
            })
          });

          if (!response.ok) {
            throw new Error('Failed to fetch namespaces');
          }

          const data = await response.json();
          if (data.namespaces) {
            set({ 
              namespaces: data.namespaces,
              loadingState: { isLoading: false, status: '' },
              lastError: null
            });
          }

        } catch (error) {
          console.error('Error fetching namespaces:', error);
          set(state => ({
            loadingState: {
              isLoading: false,
              error: error.message,
              status: 'Error loading namespaces'
            },
            lastError: error.message
          }));
          throw error;
        }
      },

      refreshDocuments: async (namespace) => {
        const state = get();
        if (!state.isConfigured || !namespace) return;

        // Check refresh cooldown
        const timeSinceLastRefresh = Date.now() - state.lastRefreshTime;
        if (timeSinceLastRefresh < REFRESH_COOLDOWN) {
          console.log('Skipping refresh due to cooldown');
          return;
        }

        try {
          set({ loadingState: { isLoading: true, status: 'Loading documents...' } });

          const response = await fetch('/api/vector', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'query_context',
              config: state.config,
              text: 'list all documents',
              namespace,
              filter: { isComplete: { $eq: true } }
            })
          });

          if (!response.ok) {
            throw new Error('Failed to fetch documents');
          }

          const data = await response.json();
          const uniqueDocs = new Map<string, IndexedDocument>();
          
          (data.matches || []).forEach((doc: IndexedDocument) => {
            const filename = doc.metadata?.filename;
            if (!filename) return;
            
            const existing = uniqueDocs.get(filename);
            if (!existing || 
                (doc.metadata?.isComplete && !existing.metadata?.isComplete) ||
                (!existing.metadata?.isComplete && doc.metadata?.timestamp > existing.metadata?.timestamp)) {
              uniqueDocs.set(filename, doc);
            }
          });

          state.setDocuments(namespace, Array.from(uniqueDocs.values()));
          set({ lastError: null });

        } catch (error) {
          console.error('Error refreshing documents:', error);
          set(state => ({
            loadingState: {
              isLoading: false,
              error: error.message,
              status: 'Error loading documents'
            },
            lastError: error.message
          }));
          throw error;
        } finally {
          set({ loadingState: { isLoading: false, status: '' } });
        }
      },

      refreshAll: async (namespace) => {
        const state = get();
        if (!state.config || !state.isConfigured || !namespace) return;

        // Cancel any existing request
        if (state.activeRequest) {
          state.activeRequest.abort();
        }

        const abortController = new AbortController();
        set({ isLoading: true, activeRequest: abortController });

        try {
          await Promise.all([
            state.refreshNamespaces(),
            state.refreshDocuments(namespace)
          ]);

          set({ lastError: null });

        } catch (error) {
          console.error('Error refreshing all data:', error);
          set(state => ({
            loadingState: {
              isLoading: false,
              status: 'Error refreshing data',
              error: error.message
            },
            lastError: error.message
          }));
          throw error;
        } finally {
          set({ 
            isLoading: false,
            activeRequest: null
          });
        }
      },

      ensureNamespace: async (namespace) => {
        const state = get();
        if (!state.config) return;

        try {
          const response = await fetch('/api/vector', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'create_namespace',
              config: state.config,
              namespace
            })
          });

          if (!response.ok) {
            throw new Error('Failed to create namespace');
          }

          await state.refreshNamespaces();
          set({ lastError: null });

        } catch (error) {
          console.error('Error ensuring namespace:', error);
          set({ lastError: error.message });
          throw error;
        }
      },

      deleteNamespace: async (namespace) => {
        const state = get();
        if (!state.config) return;

        try {
          const response = await fetch('/api/vector', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'delete_namespace',
              config: state.config,
              namespace
            })
          });

          if (!response.ok) {
            throw new Error('Failed to delete namespace');
          }

          state.clearNamespaceData(namespace);
          await state.refreshNamespaces();
          set({ lastError: null });

        } catch (error) {
          console.error('Error deleting namespace:', error);
          set({ lastError: error.message });
          throw error;
        }
      },

      processDocument: async (file, namespace) => {
        const state = get();
        if (!state.config) return;

        try {
          const text = await file.text();
          
          const response = await fetch('/api/vector', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'process_document',
              config: state.config,
              text,
              filename: file.name,
              namespace
            })
          });

          if (!response.ok) {
            throw new Error('Failed to process document');
          }

          await state.refreshDocuments(namespace);
          set({ lastError: null });

        } catch (error) {
          console.error('Error processing document:', error);
          set({ lastError: error.message });
          throw error;
        }
      },

      clearNamespaceData: (namespace) => {
        set(state => {
          const { [namespace]: _, ...remainingDocs } = state.documents;
          return { documents: remainingDocs };
        });
      },

      validateState: () => {
        const state = get();
        const errors: WorkspaceValidationError[] = [];

        if (!state.config?.apiKeys?.pinecone) {
          errors.push({ field: 'config.apiKeys.pinecone', error: 'Pinecone API key is required' });
        }

        if (!state.config?.vectordb?.indexName) {
          errors.push({ field: 'config.vectordb.indexName', error: 'Vector DB index name is required' });
        }

        // Validate documents structure
        Object.entries(state.documents).forEach(([namespace, docs]) => {
          if (!Array.isArray(docs)) {
            errors.push({ field: `documents.${namespace}`, error: 'Documents must be an array' });
          }
          
          docs.forEach((doc, index) => {
            if (!doc.metadata?.filename) {
              errors.push({ 
                field: `documents.${namespace}[${index}].metadata.filename`,
                error: 'Document filename is required'
              });
            }
          });
        });

        set({ validationErrors: errors });
        return errors;
      }
    }),
    {
      name: 'document-sidebar-state',
      partialize: (state) => ({
        selectedType: state.selectedType,
        sortOrder: state.sortOrder,
        sidebarVisible: state.sidebarVisible
      })
    }
  )
);