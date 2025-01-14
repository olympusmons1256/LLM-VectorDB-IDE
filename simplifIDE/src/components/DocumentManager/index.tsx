// src/components/DocumentManager/index.tsx
import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useDocumentStore, useDocumentNavigation, useDocumentOperations, useUploadProgress } from './store';
import { useServices, ConfigurationError } from '@/services/manager';
import { useCanvasSettings } from '@/store/settings';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DocumentManagerProps, DocumentFile } from './types';
import { TypeFilter, SearchBar } from './components/Filters';
import { UploadButtons, UploadProgressBar } from './components/Upload';
import DocumentList from './components/DocumentList';
import { generateDocumentMetadata } from './utils';
import { getSettingsRoute } from '@/types/routes';
import { Loader } from 'lucide-react';

const DocumentManager: React.FC<DocumentManagerProps> = ({
  canvasId,
  isActive = false,
  onActivate,
  onClose
}) => {
  const router = useRouter();
  
  // Services setup with error handling
  let services;
  try {
    services = useServices(canvasId);
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration Required</h3>
              <p className="text-gray-500 mb-6">
                {error.message}
              </p>
              <Button
                onClick={() => router.push(getSettingsRoute(canvasId))}
                className="bg-blue-500 text-white"
              >
                Configure Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    throw error;
  }

  const { vector } = services;
  const { addDocument, setError: setStoreError } = useDocumentStore();
  const { addUploadProgress, updateUploadProgress, removeUploadProgress } = useUploadProgress();
  const { createFolder } = useDocumentOperations();
  const { currentPath } = useDocumentNavigation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setLocalError] = useState<string | null>(null);

  const processFile = async (file: File, relativePath: string = '', parentFolderId?: string) => {
    try {
      addUploadProgress(file.name, {
        filename: file.name,
        progress: 0,
        status: 'processing'
      });

      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            updateUploadProgress(file.name, {
              progress: (e.loaded / e.total) * 50
            });
          }
        };
        reader.readAsText(file);
      });

      const documentId = crypto.randomUUID();
      const metadata = generateDocumentMetadata(file, parentFolderId);
      
      updateUploadProgress(file.name, {
        progress: 60,
        status: 'processing'
      });

      const processedData = await vector.processDocument(content, {
        documentId,
        ...metadata
      });

      const newDocument: DocumentFile = {
        id: documentId,
        title: file.name,
        content,
        metadata: {
          ...metadata,
          chunks: processedData.chunks,
          vectorIds: processedData.vectorIds,
          chunkContent: processedData.chunkContent,
          embeddings: processedData.embeddings
        }
      };

      addDocument(newDocument);

      updateUploadProgress(file.name, {
        progress: 100,
        status: 'complete'
      });

      setTimeout(() => {
        removeUploadProgress(file.name);
      }, 2000);

      return documentId;
    } catch (error) {
      console.error('Error processing file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error processing file';
      updateUploadProgress(file.name, {
        status: 'error',
        error: errorMessage
      });
      setLocalError(errorMessage);
      if (error instanceof ConfigurationError) {
        router.push(getSettingsRoute(canvasId));
      }
      throw error;
    }
  };

  const handleFileSelect = async (files: FileList) => {
    if (!files.length) return;

    setIsProcessing(true);
    setStoreError(null);
    setLocalError(null);

    try {
      if (files[0].webkitRelativePath) {
        for (const file of Array.from(files)) {
          const path = file.webkitRelativePath;
          const pathParts = path.split('/');
          const fileName = pathParts.pop();
          
          let currentPath = '';
          let parentId: string | undefined = undefined;

          for (const folder of pathParts) {
            currentPath = currentPath ? `${currentPath}/${folder}` : folder;
            try {
              parentId = await createFolder(folder, parentId);
            } catch (error) {
              console.error('Error creating folder:', error);
              throw error;
            }
          }

          if (fileName) {
            await processFile(file, currentPath, parentId);
          }
        }
      } else {
        for (const file of Array.from(files)) {
          await processFile(file);
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setStoreError(errorMessage);
      setLocalError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setLocalError(null);

    try {
      const results = await vector.searchDocuments(searchQuery);
      // TODO: Implement search results display
      console.log('Search results:', results);
    } catch (error) {
      console.error('Search failed:', error);
      if (error instanceof ConfigurationError) {
        router.push(getSettingsRoute(canvasId));
      } else {
        setLocalError('Search failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div 
      className={`flex flex-col h-full ${isActive ? 'border-blue-500' : 'border-gray-200'}`}
      onClick={onActivate}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-lg font-medium">Documents</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500"
            aria-label="Close document manager"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                clipRule="evenodd" 
              />
            </svg>
          </button>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TypeFilter
            selectedType={selectedType}
            onTypeSelect={setSelectedType}
          />

          <div className="flex space-x-4">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
              isSearching={isSearching}
            />
            
            <UploadButtons
              onFileSelect={handleFileSelect}
              isUploading={isProcessing}
            />
          </div>

          <UploadProgressBar />

          <ScrollArea className="h-[500px]">
            <DocumentList />
          </ScrollArea>
        </div>
      </CardContent>
    </div>
  );
};

export default DocumentManager;