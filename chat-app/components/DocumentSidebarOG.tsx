// components/DocumentSidebar.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FileUp, FolderUp, Loader2, Plus, File, Trash2, BookOpen, RefreshCw, X, Layers, ClipboardList, FileText } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { EmbeddingConfig } from '@/services/embedding';
import type { LucideIcon } from 'lucide-react';

const MAX_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB per chunk
const REFRESH_INTERVAL = 30000; // 30 seconds

interface FileInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  directory?: boolean;
  webkitdirectory?: string;
}

interface DocumentMetadata {
  filename: string;
  type: 'project-structure' | 'core-architecture' | 'code' | 'documentation' | 'plan';
  timestamp: string;
  chunkIndex?: number;
  totalChunks?: number;
  isComplete?: boolean;
  size?: number;
  contentType?: string;
  language?: string;
}

interface NamespaceStats {
  recordCount: number;
  hasDocumentation: boolean;
  totalSize: number;
}

interface IndexedDocument {
  metadata?: DocumentMetadata;
  text?: string;
}

interface DocumentSidebarProps {
  config: EmbeddingConfig;
  onError: (error: string) => void;
  onNamespaceChange: (namespace: string) => void;
  currentNamespace: string;
  visible: boolean;
}

const DOCUMENT_ICONS: Record<string, LucideIcon> = {
  'project-plans': ClipboardList,
  'plan': ClipboardList,
  'instructions': BookOpen,
  'code': File,
  'documentation': FileText,
  'project-structure': File,
  'core-architecture': Layers
};

const TYPE_MAPPING = {
  'project-plans': ['plan', 'project-plans'],
  'instructions': ['instructions'],
  'code': ['code', 'project-structure', 'core-architecture'],
  'documentation': ['documentation']
};

// Custom hook for setInterval with immediate first run
function useInterval(callback: () => void, delay: number | null) {
  useEffect(() => {
    if (delay === null) return;
    callback(); // Run immediately
    const id = setInterval(callback, delay);
    return () => clearInterval(id);
  }, [callback, delay]);
}

async function processFile(
  file: File, 
  config: EmbeddingConfig, 
  namespace: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  console.log('Processing file:', file.name, 'size:', file.size);
  const totalChunks = Math.ceil(file.size / MAX_CHUNK_SIZE);
  const baseMetadata = {
    contentType: file.type,
    size: file.size,
    lastModified: new Date(file.lastModified).toISOString()
  };

  try {
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * MAX_CHUNK_SIZE;
      const end = Math.min(start + MAX_CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const text = await chunk.text();

      console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks} for ${file.name}`);

      const response = await fetch(new URL('/api/vector', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'process_document',
          config,
          text,
          filename: file.name,
          namespace,
          metadata: {
            ...baseMetadata,
            chunkIndex,
            totalChunks,
            isComplete: chunkIndex === totalChunks - 1
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process chunk');
      }

      if (onProgress) {
        onProgress((chunkIndex + 1) / totalChunks * 100);
      }
    }
    console.log('File processing completed:', file.name);
  } catch (error) {
    console.error('Error processing file:', file.name, error);
    throw new Error(`Error processing file ${file.name}: ${error.message}`);
  }
}

export function DocumentSidebar({ 
  config, 
  onError, 
  onNamespaceChange, 
  currentNamespace, 
  visible 
}: DocumentSidebarProps) {
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [namespaces, setNamespaces] = useState<Record<string, NamespaceStats>>({});
  const [documents, setDocuments] = useState<Record<string, IndexedDocument[]>>({});
  const [showNewNamespaceInput, setShowNewNamespaceInput] = useState(false);
  const [newNamespaceName, setNewNamespaceName] = useState('');
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [namespaceToDelete, setNamespaceToDelete] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [processingErrors, setProcessingErrors] = useState<Array<{ filename: string; error: string }>>([]);
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [refreshInterval, setRefreshInterval] = useState<number | null>(REFRESH_INTERVAL);
  
  const { toast } = useToast();

  const handleUploadProgress = useCallback((fileName: string, current: number, total: number) => {
    setUploadProgress({
      fileName,
      current: Math.min(current, total),
      total
    });
  }, []);

  const refreshNamespaceDocuments = useCallback(async (namespace: string) => {
    console.log('Refreshing documents for namespace:', namespace);
    if (!isConfigured || !namespace || isRefreshing) return;

    try {
      setIsRefreshing(true);
      setIsLoadingDocuments(true);
      const response = await fetch(new URL('/api/vector', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'query_context',
          config,
          text: 'list all documents',
          namespace,
          filter: {
            $and: [
              { isComplete: { $eq: true } }
            ]
          },
          includeTypes: ['project-structure', 'core-architecture', 'code', 'documentation', 'project-plans', 'plan', 'instructions']
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      console.log('Received documents:', data.matches?.length);
      
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
      console.log('Unique documents after processing:', processedDocs.length);
      
      setDocuments(prev => ({
        ...prev,
        [namespace]: processedDocs
      }));

    } catch (error: any) {
      console.error('Error refreshing documents:', error);
      onError(error.message);
    } finally {
      setIsRefreshing(false);
      setIsLoadingDocuments(false);
    }
  }, [isConfigured, isRefreshing, config, onError]);

  // Set up automatic refresh
  useInterval(() => {
    if (currentNamespace && !isProcessing) {
      console.log('Auto-refreshing documents...');
      refreshNamespaceDocuments(currentNamespace);
    }
  }, refreshInterval);

  useEffect(() => {
    setMounted(true);
    const isConfigValid = Boolean(
      config?.apiKeys?.pinecone &&
      config?.vectordb?.indexName &&
      config?.vectordb?.cloud &&
      config?.vectordb?.region
    );
    
    console.log('Config validation:', isConfigValid);
    setIsConfigured(isConfigValid);
    if (isConfigValid) {
      listNamespaces();
    }
  }, [config]);

  useEffect(() => {
    if (!isConfigured || !currentNamespace) return;
    console.log('Initial load for namespace:', currentNamespace);
    refreshNamespaceDocuments(currentNamespace);
  }, [currentNamespace, isConfigured, refreshNamespaceDocuments]);

  const listNamespaces = async () => {
    if (!isConfigured) return;

    try {
      console.log('Listing namespaces...');
      const response = await fetch(new URL('/api/vector', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'list_namespaces',
          config
        })
      });

      if (!response.ok) {
        throw new Error('Failed to list namespaces');
      }

      const data = await response.json();
      console.log('Found namespaces:', Object.keys(data.namespaces || {}).length);
      if (data.namespaces) {
        setNamespaces(data.namespaces);
      }
    } catch (error: any) {
      console.error('Error listing namespaces:', error);
      onError('Failed to list namespaces');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !currentNamespace) return;

    setIsProcessing(true);
    setProcessingErrors([]);
    handleUploadProgress('', 0, files.length);
    
    // Pause auto-refresh during upload
    setRefreshInterval(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        console.log('Processing file:', file.name);
        handleUploadProgress(file.name, i, files.length);
        
        await processFile(file, config, currentNamespace, (progress) => {
          handleUploadProgress(file.name, i + (progress / 100), files.length);
        });

        toast({
          title: 'File Processed',
          description: `Successfully processed: ${file.name}`
        });
      } catch (error: any) {
        console.error('Error processing file:', file.name, error);
        setProcessingErrors(prev => [...prev, {
          filename: file.name,
          error: error.message || 'Failed to process file'
        }]);

        toast({
          title: 'Processing Error',
          description: `Error processing ${file.name}`,
          variant: 'destructive'
        });
      }
    }

    setIsProcessing(false);
    handleUploadProgress('', 0, 0);
    e.target.value = '';
    
    // Resume auto-refresh and trigger immediate refresh
    setRefreshInterval(REFRESH_INTERVAL);
    await refreshNamespaceDocuments(currentNamespace);
  };

  const handleDirectoryUpload = async (e: React.ChangeEvent<HTMLInputElement & FileInputProps>) => {
    const files = e.target.files;
    if (!files || !currentNamespace) return;

    setIsProcessing(true);
    setProcessingErrors([]);
    handleUploadProgress('', 0, files.length);
    
    // Pause auto-refresh during upload
    setRefreshInterval(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        console.log('Processing directory file:', file.name);
        handleUploadProgress(file.name, i, files.length);
        
        await processFile(file, config, currentNamespace, (progress) => {
          handleUploadProgress(file.name, i + (progress / 100), files.length);
        });

        toast({
          title: 'File Processed',
          description: `Successfully processed: ${file.name}`
        });
      } catch (error: any) {
        console.error('Error processing directory file:', file.name, error);
        setProcessingErrors(prev => [...prev, {
          filename: file.name,
          error: error.message || 'Failed to process file'
        }]);

        toast({
          title: 'Processing Error',
          description: `Error processing ${file.name}`,
          variant: 'destructive'
        });
      }
    }

    setIsProcessing(false);
    handleUploadProgress('', 0, 0);
    e.target.value = '';
    
    // Resume auto-refresh and trigger immediate refresh
    setRefreshInterval(REFRESH_INTERVAL);
    await refreshNamespaceDocuments(currentNamespace);
  };

  const handleCreateNamespace = async () => {
    if (!newNamespaceName.trim()) {
      onError('Namespace name cannot be empty');
      return;
    }
  
    try {
      console.log('Creating namespace:', newNamespaceName);
      const response = await fetch(new URL('/api/vector', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'create_namespace',
          config,
          namespace: newNamespaceName
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to create namespace');
      }
  
      console.log('Namespace created successfully');
      setNewNamespaceName('');
      setShowNewNamespaceInput(false);
      toast({
        title: 'Namespace Created',
        description: `Created namespace: ${newNamespaceName}`
      });

      await listNamespaces();
    } catch (error: any) {
      console.error('Error creating namespace:', error);
      onError(error.message);
    }
  };

  const handleDeleteNamespace = async (namespace: string) => {
    try {
      console.log('Deleting namespace:', namespace);
      setIsDeleting(true);
      
      const response = await fetch(new URL('/api/vector', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'delete_namespace',
          config,
          namespace
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete namespace');
      }

      console.log('Namespace deleted successfully');
      setNamespaces(prev => {
        const { [namespace]: removed, ...rest } = prev;
        return rest;
      });

      setDocuments(prev => {
        const { [namespace]: removed, ...rest } = prev;
        return rest;
      });

      if (currentNamespace === namespace) {
        onNamespaceChange('');
      }

      toast({
        title: 'Namespace Deleted',
        description: `Successfully deleted namespace: ${namespace}`
      });

      await listNamespaces();
    } catch (error: any) {
      console.error('Error deleting namespace:', error);
      onError(`Failed to delete namespace: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setNamespaceToDelete(null);
    }
  };

  const clearProcessingErrors = () => {
    console.log('Clearing processing errors');
    setProcessingErrors([]);
  };

  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getFilteredDocuments = () => {
    if (!documents || !currentNamespace || !documents[currentNamespace]) {
      return [];
    }

    let docs = documents[currentNamespace].filter(doc => {
      // When no type is selected, show all documents
      if (!selectedDocType) return true;
      
      // Check if document type matches any of the mapped types
      const validTypes = TYPE_MAPPING[selectedDocType as keyof typeof TYPE_MAPPING] || [];
      return validTypes.includes(doc?.metadata?.type || '');
    });

    // Sort by timestamp
    docs.sort((a, b) => {
      const timeA = new Date(a?.metadata?.timestamp || 0).getTime();
      const timeB = new Date(b?.metadata?.timestamp || 0).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return docs;
  };

  const renderDocumentList = (docs: IndexedDocument[]) => {
    return docs.map((doc, idx) => {
      const metadata = doc.metadata;
      if (!metadata) return null;

      const Icon = DOCUMENT_ICONS[metadata.type] || File;
      
      return (
        <div 
          key={`${metadata.filename}-${idx}`}
          className="flex items-center gap-2 p-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Icon className="h-4 w-4 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="truncate" title={metadata.filename}>
              {metadata.filename}
            </div>
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <span>{formatFileSize(metadata.size)}</span>
              <span className="mx-1">•</span>
              <span title={new Date(metadata.timestamp).toLocaleString()}>
                {new Date(metadata.timestamp).toLocaleDateString()}
              </span>
              {metadata.contentType && (
                <>
                  <span className="mx-1">•</span>
                  <span>{metadata.contentType}</span>
                </>
              )}
            </div>
          </div>
        </div>
      );
    });
  };

  if (!mounted || !visible) {
    return null;
  }

  const filteredDocs = getFilteredDocuments();

  return (
    <div className="w-full h-full border-r dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Document Manager</h2>
        <button
          onClick={listNamespaces}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title="Refresh namespaces"
        >
          <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!isConfigured ? (
        <div className="flex-1 flex items-center justify-center text-center p-4">
          <div className="text-gray-500 dark:text-gray-400">
            <p className="mb-2">Vector database not configured</p>
            <p className="text-sm">Please add your Pinecone API key and configure the vector database in settings.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Namespace</label>
            <div className="flex items-center gap-2">
              <select
                value={currentNamespace}
                onChange={(e) => {
                  const newNamespace = e.target.value;
                  onNamespaceChange(newNamespace);
                  if (newNamespace) {
                    refreshNamespaceDocuments(newNamespace);
                  }
                }}
                className="flex-1 p-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800"
              >
                <option value="">Select a namespace</option>
                {Object.entries(namespaces).map(([namespace, stats]) => (
                  <option key={namespace} value={namespace}>
                    {namespace} ({stats?.recordCount || 0} files, {formatFileSize(stats?.totalSize)})
                  </option>
                ))}
              </select>
              {currentNamespace && namespaces[currentNamespace] && (
                <button
                  onClick={() => setNamespaceToDelete(currentNamespace)}
                  className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                  title="Delete namespace"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {!showNewNamespaceInput ? (
              <button
                onClick={() => setShowNewNamespaceInput(true)}
                className="mt-2 flex items-center gap-2 text-blue-500 hover:text-blue-600"
              >
                <Plus className="h-4 w-4" />
                New Namespace
              </button>
            ) : (
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  value={newNamespaceName}
                  onChange={(e) => setNewNamespaceName(e.target.value)}
                  placeholder="Enter namespace name"
                  className="w-full p-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateNamespace}
                    className="flex-1 p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowNewNamespaceInput(false);
                      setNewNamespaceName('');
                    }}
                    className="flex-1 p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {currentNamespace && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Show</label>
              <select
                value={selectedDocType || ''}
                onChange={(e) => setSelectedDocType(e.target.value || null)}
                className="w-full p-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800"
              >
                <option value="">All Files</option>
                <option value="project-plans">Project Plans</option>
                <option value="instructions">Instructions</option>
                <option value="code">Code</option>
                <option value="documentation">Documentation</option>
              </select>
            </div>
          )}

          {processingErrors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Processing Errors</h3>
                <button
                  onClick={clearProcessingErrors}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="space-y-1 text-sm text-red-600 dark:text-red-300">
                {processingErrors.map((error, index) => (
                  <li key={index}>
                    {error.filename}: {error.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {currentNamespace && (
            <div className="space-y-2">
              <label className={`flex items-center gap-2 p-2 rounded-lg w-full
                             ${isProcessing
                               ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed' 
                               : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
                           } text-white transition-colors text-center justify-center`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {uploadProgress.fileName && (
                      <span className="truncate max-w-[200px]">
                        Processing: {uploadProgress.fileName}
                      </span>
                    )}
                    {uploadProgress.total > 1 && (
                      <span>
                        ({Math.floor(uploadProgress.current)}/{uploadProgress.total})
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <FileUp className="h-5 w-5" />
                    Upload Files
                  </>
                )}
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="hidden"
                  multiple
                />
              </label>

              <label 
                className={`flex items-center gap-2 p-2 rounded-lg w-full
                           ${isProcessing
                             ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed' 
                             : 'bg-green-500 hover:bg-green-600 cursor-pointer'
                           } text-white transition-colors text-center justify-center`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing directory...
                  </>
                ) : (
                  <>
                    <FolderUp className="h-5 w-5" />
                    Upload Directory
                  </>
                )}
                <input
                  type="file"
                  onChange={handleDirectoryUpload}
                  disabled={isProcessing}
                  className="hidden"
                  {...{ webkitdirectory: '', directory: true } as FileInputProps}
                  multiple
                />
              </label>
            </div>
          )}

          {currentNamespace && (
            <div className="flex-1 mt-4 flex flex-col min-h-0">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {filteredDocs.length} documents
                </span>
                <button
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Sort: {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
                </button>
              </div>
              
              <div className="overflow-y-auto flex-1">
                {isLoadingDocuments ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                ) : filteredDocs.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    No documents in this section
                  </div>
                ) : (
                  <div className="space-y-1">
                    {renderDocumentList(filteredDocs)}
                  </div>
                )}
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex items-center gap-3 max-w-md">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div className="flex-1 min-w-0">
                {uploadProgress.fileName && (
                  <div className="truncate text-sm">
                    {uploadProgress.fileName}
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  {uploadProgress.total > 1 
                    ? `Processing files (${Math.floor(uploadProgress.current)}/${uploadProgress.total})` 
                    : 'Processing file...'}
                </div>
              </div>
            </div>
          )}

          <AlertDialog 
            open={!!namespaceToDelete} 
            onOpenChange={(open) => !isDeleting && setNamespaceToDelete(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Namespace</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the namespace "{namespaceToDelete}"? 
                  This will permanently delete all documents in this namespace.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => namespaceToDelete && handleDeleteNamespace(namespaceToDelete)}
                  disabled={isDeleting}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}

export default DocumentSidebar;