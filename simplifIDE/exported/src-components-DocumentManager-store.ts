// src/components/DocumentManager/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DocumentFile, DocumentMetadata, UploadProgress } from './types';
import { generateFolderMetadata } from './utils';

interface DocumentState {
  documents: Record<string, DocumentFile>;
  selectedDocumentId: string | null;
  currentPath: string[];
  expandedFolders: Set<string>;
  uploads: Record<string, UploadProgress>;
  isLoading: boolean;
  error: string | null;
}

interface DocumentActions {
  addDocument: (document: DocumentFile) => void;
  addFolder: (name: string, parentId?: string) => string;
  updateDocument: (id: string, updates: Partial<DocumentFile>) => void;
  removeDocument: (id: string) => void;
  setSelectedDocument: (id: string | null) => void;
  setCurrentPath: (path: string[]) => void;
  toggleFolder: (id: string) => void;
  addUploadProgress: (filename: string, progress: UploadProgress) => void;
  updateUploadProgress: (filename: string, updates: Partial<UploadProgress>) => void;
  removeUploadProgress: (filename: string) => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  getFolderContents: (folderId?: string) => DocumentFile[];
  getDocumentPath: (id: string) => string[];
  clearDocuments: () => void;
}

export const useDocumentStore = create<DocumentState & DocumentActions>()(
  persist(
    (set, get) => ({
      documents: {},
      selectedDocumentId: null,
      currentPath: [],
      expandedFolders: new Set(),
      uploads: {},
      isLoading: false,
      error: null,

      addDocument: (document) => set((state) => {
        const updatedDocuments = { ...state.documents };
        updatedDocuments[document.id] = document;

        if (document.metadata.parentId) {
          const parent = updatedDocuments[document.metadata.parentId];
          if (parent) {
            updatedDocuments[document.metadata.parentId] = {
              ...parent,
              metadata: {
                ...parent.metadata,
                children: [...(parent.metadata.children || []), document.id]
              }
            };
          }
        }

        return { documents: updatedDocuments };
      }),

      addFolder: (name: string, parentId?: string) => {
        const id = crypto.randomUUID();
        const folderMetadata = generateFolderMetadata(name, parentId);
        
        const folder: DocumentFile = {
          id,
          title: name,
          content: '',
          metadata: folderMetadata
        };

        set((state) => {
          const updatedDocuments = { ...state.documents, [id]: folder };

          if (parentId) {
            const parent = updatedDocuments[parentId];
            if (parent) {
              updatedDocuments[parentId] = {
                ...parent,
                metadata: {
                  ...parent.metadata,
                  children: [...(parent.metadata.children || []), id]
                }
              };
            }
          }

          return { documents: updatedDocuments };
        });

        return id;
      },

      updateDocument: (id, updates) => set((state) => ({
        documents: {
          ...state.documents,
          [id]: {
            ...state.documents[id],
            ...updates,
            metadata: {
              ...state.documents[id].metadata,
              ...(updates.metadata || {})
            }
          }
        }
      })),

      removeDocument: (id) => set((state) => {
        const documents = { ...state.documents };
        const doc = documents[id];

        // Recursively collect all descendant IDs if it's a folder
        const getAllDescendants = (docId: string): string[] => {
          const doc = documents[docId];
          if (!doc?.metadata.children) return [docId];
          return [
            docId,
            ...doc.metadata.children.flatMap(childId => getAllDescendants(childId))
          ];
        };

        const idsToRemove = getAllDescendants(id);

        // Update parent's children array if document has a parent
        if (doc?.metadata.parentId) {
          const parent = documents[doc.metadata.parentId];
          if (parent) {
            documents[doc.metadata.parentId] = {
              ...parent,
              metadata: {
                ...parent.metadata,
                children: parent.metadata.children?.filter(childId => childId !== id)
              }
            };
          }
        }

        // Remove all collected IDs
        idsToRemove.forEach(idToRemove => {
          delete documents[idToRemove];
        });

        return {
          documents,
          selectedDocumentId: state.selectedDocumentId === id ? null : state.selectedDocumentId
        };
      }),

      setSelectedDocument: (id) => set({ selectedDocumentId: id }),

      setCurrentPath: (path) => set({ currentPath: path }),

      toggleFolder: (id) => set((state) => {
        const newExpanded = new Set(state.expandedFolders);
        if (newExpanded.has(id)) {
          newExpanded.delete(id);
        } else {
          newExpanded.add(id);
        }
        return { expandedFolders: newExpanded };
      }),

      addUploadProgress: (filename, progress) => set((state) => ({
        uploads: { ...state.uploads, [filename]: progress }
      })),

      updateUploadProgress: (filename, updates) => set((state) => ({
        uploads: {
          ...state.uploads,
          [filename]: { ...state.uploads[filename], ...updates }
        }
      })),

      removeUploadProgress: (filename) => set((state) => {
        const { [filename]: removed, ...remaining } = state.uploads;
        return { uploads: remaining };
      }),

      setError: (error) => set({ error }),

      setLoading: (isLoading) => set({ isLoading }),

      getFolderContents: (folderId) => {
        const state = get();
        return Object.values(state.documents).filter(doc => 
          doc.metadata.parentId === folderId
        );
      },

      getDocumentPath: (id) => {
        const state = get();
        const path: string[] = [];
        let current = state.documents[id];
        
        while (current) {
          path.unshift(current.title);
          if (!current.metadata.parentId) break;
          current = state.documents[current.metadata.parentId];
        }
        
        return path;
      },

      clearDocuments: () => set({
        documents: {},
        selectedDocumentId: null,
        currentPath: [],
        expandedFolders: new Set(),
        uploads: {},
        error: null,
        isLoading: false
      })
    }),
    {
      name: 'document-storage',
      partialize: (state) => ({
        documents: Object.fromEntries(
          Object.entries(state.documents).map(([id, doc]) => [
            id,
            {
              ...doc,
              // Only truncate content for non-folder documents
              content: doc.metadata.isFolder ? doc.content : 
                doc.content.length > 1000 ? 
                doc.content.slice(0, 1000) + '...' : 
                doc.content
            }
          ])
        )
      })
    }
  )
);

// Helper hooks for common document operations
export function useSelectedDocument() {
  const { documents, selectedDocumentId, updateDocument } = useDocumentStore();
  const selected = selectedDocumentId ? documents[selectedDocumentId] : undefined;

  return {
    document: selected,
    updateDocument: selected ? 
      (updates: Partial<DocumentFile>) => updateDocument(selected.id, updates) : 
      undefined
  };
}

export function useDocumentNavigation() {
  const { 
    documents, 
    currentPath,
    expandedFolders,
    setCurrentPath,
    toggleFolder,
    getFolderContents
  } = useDocumentStore();

  const navigateToFolder = (folderId: string) => {
    const path = [];
    let current = documents[folderId];
    
    while (current) {
      path.unshift(current.id);
      if (!current.metadata.parentId) break;
      current = documents[current.metadata.parentId];
    }
    
    setCurrentPath(path);
  };

  return {
    currentPath,
    expandedFolders,
    navigateToFolder,
    toggleFolder,
    getFolderContents,
    getCurrentFolderContents: () => {
      const currentFolderId = currentPath[currentPath.length - 1];
      return getFolderContents(currentFolderId);
    }
  };
}

export function useDocumentOperations() {
  const {
    addDocument,
    addFolder,
    removeDocument,
    updateDocument,
    setError,
    setLoading
  } = useDocumentStore();

  const createFolder = async (name: string, parentId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const folderId = addFolder(name, parentId);
      return folderId;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create folder');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    addDocument,
    createFolder,
    removeDocument,
    updateDocument
  };
}

export function useUploadProgress() {
  const {
    uploads,
    addUploadProgress,
    updateUploadProgress,
    removeUploadProgress
  } = useDocumentStore();

  const activeUploads = Object.values(uploads).filter(
    upload => upload.status === 'pending' || upload.status === 'processing'
  );

  const totalProgress = activeUploads.length > 0 ?
    activeUploads.reduce((acc, upload) => acc + upload.progress, 0) / activeUploads.length :
    0;

  return {
    uploads,
    activeUploads,
    totalProgress,
    addUploadProgress,
    updateUploadProgress,
    removeUploadProgress
  };
}