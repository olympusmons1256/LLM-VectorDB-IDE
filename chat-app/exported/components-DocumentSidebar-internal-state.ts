// components/DocumentSidebar/internal/state.ts
import { create } from 'zustand';
import type { EmbeddingConfig } from '@/services/embedding';
import type { DocumentMetadata, LoadingState, NamespaceStats, IndexedDocument } from './types';

const POLLING_INTERVAL = 30000; // 30 seconds
const DEBOUNCE_DELAY = 1000; // 1 second
const INITIAL_LOAD_DELAY = 1000; // 1 second delay before first load

interface DocumentSidebarState {
  config: EmbeddingConfig | null;
  isConfigured: boolean;
  isLoading: boolean;
  loadingState: LoadingState;
  lastRefreshTime: number;
  activeRequest: AbortController | null;
  documents: Record<string, IndexedDocument[]>;
  namespaces: Record<string, NamespaceStats>;
  selectedType: string | null;
  sortOrder: 'asc' | 'desc';
  currentNamespace: string;
  initialize: (config: EmbeddingConfig) => void;
  setLoadingState: (state: LoadingState) => void;
  setDocuments: (namespace: string, docs: IndexedDocument[]) => void;
  setNamespaces: (namespaces: Record<string, NamespaceStats>) => void;
  setSelectedType: (type: string | null) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  refreshNamespaces: () => Promise<void>;
  refreshDocuments: (namespace: string) => Promise<void>;
  refreshAll: (namespace: string) => Promise<void>;
}

const INITIAL_STATE = {
  config: null,
  isConfigured: false,
  isLoading: false,
  loadingState: { isLoading: false, status: '' },
  lastRefreshTime: 0,
  activeRequest: null,
  documents: {},
  namespaces: {},
  selectedType: null,
  sortOrder: 'desc',
  currentNamespace: ''
};

// Cache for storing recently fetched data
const cache = new Map<string, { data: any; timestamp: number }>();

export const useDocumentSidebarState = create<DocumentSidebarState>((set, get) => ({
  ...INITIAL_STATE,

  initialize: (config) => {
    const state = get();
    console.log('Initializing with config:', {
      indexName: config?.vectordb?.indexName,
      cloud: config?.vectordb?.cloud,
      region: config?.vectordb?.region,
      hasPineconeKey: !!config?.apiKeys?.pinecone,
      hasVoyageKey: !!config?.apiKeys?.voyage
    });

    // Only update if config actually changed
    if (JSON.stringify(state.config) === JSON.stringify(config)) {
      console.log('Config unchanged, skipping initialization');
      return;
    }

    const isConfigValid = Boolean(
      config?.apiKeys?.pinecone &&
      config?.vectordb?.indexName &&
      config?.vectordb?.cloud &&
      config?.vectordb?.region
    );

    console.log('Config validation:', { isConfigValid });

    set({ 
      config, 
      isConfigured: isConfigValid,
      loadingState: { isLoading: false, status: '' }
    });

    // Delay initial load
    if (isConfigValid) {
      console.log('Starting initial load with delay:', INITIAL_LOAD_DELAY);
      setTimeout(async () => {
        const currentState = get();
        if (currentState.currentNamespace) {
          console.log('Initial load for namespace:', currentState.currentNamespace);
          try {
            await currentState.refreshNamespaces();
            await currentState.refreshDocuments(currentState.currentNamespace);
          } catch (error) {
            console.error('Error during initial load:', error);
          }
        } else {
          console.log('No current namespace for initial load');
          await currentState.refreshNamespaces();
        }
      }, INITIAL_LOAD_DELAY);
    }
  },

  setLoadingState: (loadingState) => set({ loadingState }),
  
  setDocuments: (namespace, docs) => set(state => ({
    documents: { ...state.documents, [namespace]: docs }
  })),
  
  setNamespaces: (namespaces) => {
    console.log('Setting namespaces:', namespaces);
    set({ namespaces });
  },
  setSelectedType: (selectedType) => set({ selectedType }),
  setSortOrder: (sortOrder) => set({ sortOrder }),

  refreshDocuments: async (namespace: string) => {
    const state = get();
    if (!state.config || !state.isConfigured || !namespace) {
      console.log('Cannot refresh documents - invalid state:', {
        hasConfig: !!state.config,
        isConfigured: state.isConfigured,
        namespace
      });
      return;
    }

    // Check cache first
    const cacheKey = `docs-${namespace}`;
    const cached = cache.get(cacheKey);
    const now = Date.now();
    
    if (cached && now - cached.timestamp < POLLING_INTERVAL) {
      console.log('Using cached documents for namespace:', namespace);
      set(state => ({
        documents: { ...state.documents, [namespace]: cached.data }
      }));
      return;
    }

    try {
      // Cancel any ongoing request
      if (state.activeRequest) {
        state.activeRequest.abort();
      }

      const abortController = new AbortController();
      set({ activeRequest: abortController });

      set({
        loadingState: { isLoading: true, status: 'Fetching documents...' }
      });

      console.log('Fetching documents for namespace:', namespace);
      const response = await fetch(
        new URL('/api/vector', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'query_context',
            config: state.config,
            text: 'list all documents',
            namespace,
            filter: { isComplete: { $eq: true } },
            includeTypes: ['project-structure', 'core-architecture', 'code', 'documentation']
          }),
          signal: abortController.signal
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      console.log('Document query response:', {
        matchCount: data.matches?.length,
        namespace
      });
      
      // Process and deduplicate documents
      const uniqueDocs = new Map();
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

      const processedDocs = Array.from(uniqueDocs.values());
      console.log('Processed documents:', {
        total: processedDocs.length,
        namespace
      });

      // Update cache
      cache.set(cacheKey, {
        data: processedDocs,
        timestamp: now
      });

      set(state => ({
        documents: { ...state.documents, [namespace]: processedDocs },
        lastRefreshTime: now,
        loadingState: { isLoading: false, status: '' },
        activeRequest: null
      }));

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      console.error('Error fetching documents:', error);
      set({
        loadingState: {
          isLoading: false,
          status: 'Error loading documents',
          error: error.message
        },
        activeRequest: null
      });
      throw error;
    }
  },

  refreshNamespaces: async () => {
    const state = get();
    if (!state.config || !state.isConfigured) {
      console.log('Cannot refresh namespaces - not configured');
      return;
    }

    try {
      const cacheKey = 'namespaces';
      const cached = cache.get(cacheKey);
      const now = Date.now();
      
      if (cached && now - cached.timestamp < POLLING_INTERVAL) {
        console.log('Using cached namespaces');
        set({ namespaces: cached.data });
        return;
      }

      set({
        loadingState: { isLoading: true, status: 'Fetching namespaces...' }
      });

      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000';
      console.log('Attempting to fetch namespaces from:', `${apiBase}/api/vector`);

      const requestBody = {
        operation: 'list_namespaces',
        config: state.config
      };
      
      console.log('Request payload:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${apiBase}/api/vector`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }).catch(error => {
        console.error('Fetch failed:', error);
        throw new Error(`Network request failed: ${error.message}`);
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Namespaces response:', data);

      if (data.namespaces) {
        cache.set(cacheKey, {
          data: data.namespaces,
          timestamp: now
        });
        set({ namespaces: data.namespaces });
      }

    } catch (error: any) {
      console.error('Error fetching namespaces:', error);
      set(state => ({
        loadingState: {
          ...state.loadingState,
          error: error.message,
          status: 'Error loading namespaces'
        }
      }));
    } finally {
      set({ 
        loadingState: { isLoading: false, status: '' }
      });
    }
  },

  refreshAll: async (namespace: string) => {
    const state = get();
    if (!state.config || !state.isConfigured || !namespace) {
      console.log('Cannot refresh all - invalid state:', {
        hasConfig: !!state.config,
        isConfigured: state.isConfigured,
        namespace
      });
      return;
    }
    
    set({ isLoading: true });
    try {
      console.log('Starting refresh all for namespace:', namespace);
      await Promise.all([
        state.refreshNamespaces(),
        state.refreshDocuments(namespace)
      ]);
      console.log('Refresh all completed');
    } catch (error: any) {
      console.error('Error refreshing all data:', error);
      set({
        loadingState: {
          isLoading: false,
          status: 'Error refreshing data',
          error: error.message
        }
      });
    } finally {
      set({ isLoading: false });
    }
  }
}));