// components/DocumentSidebar/DocumentSidebar.tsx
'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { NamespaceManager, FileTypeFilter, FileUploader, DocumentList } from './internal/components';
import { useDocumentSidebarState } from './internal/state';
import type { DocumentSidebarProps } from './internal/types';

export function DocumentSidebar({ 
  config, 
  onError, 
  onNamespaceChange, 
  currentNamespace, 
  visible 
}: DocumentSidebarProps) {
  const {
    isConfigured,
    isLoading,
    loadingState,
    namespaces,
    initialize,
    refreshAll
  } = useDocumentSidebarState();

  useEffect(() => {
    console.log('DocumentSidebar mounted with config:', {
      isConfigured: !!config?.apiKeys?.pinecone,
      indexName: config?.vectordb?.indexName,
      hasVoyageKey: !!config?.apiKeys?.voyage,
      cloud: config?.vectordb?.cloud,
      region: config?.vectordb?.region
    });
    
    if (config) {
      console.log('Initializing with config...');
      initialize(config);
    }
  }, [config, initialize]);

  if (!visible) {
    return null;
  }

  return (
    <div className="h-[calc(100vh-var(--header-height,64px))] flex flex-col overflow-hidden">
      {/* Header with namespace manager */}
      <div className="flex-shrink-0 border-b dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">Document Manager</h2>
          {isConfigured && currentNamespace && (
            <button
              onClick={() => {
                console.log('Refreshing all for namespace:', currentNamespace);
                refreshAll(currentNamespace);
              }}
              className="p-1 hover:bg-secondary rounded-sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {!isConfigured ? (
          <div className="text-sm text-muted-foreground">
            Please add your Pinecone API key and configure the vector database in settings.
          </div>
        ) : (
          <NamespaceManager
            currentNamespace={currentNamespace}
            onNamespaceChange={onNamespaceChange}
            onError={onError}
          />
        )}
      </div>

      {isConfigured && currentNamespace && (
        <>
          {/* File type filter */}
          <div className="flex-shrink-0 border-b dark:border-gray-700 p-4">
            <FileTypeFilter />
          </div>
          
          {/* File uploader */}
          <div className="flex-shrink-0 border-b dark:border-gray-700">
            <FileUploader 
              namespace={currentNamespace} 
              onError={onError}
            />
          </div>

          {/* Document list - scrollable area */}
          <div className="flex-1 min-h-0 overflow-auto">
            <DocumentList 
              namespace={currentNamespace}
              loadingState={loadingState}
            />
          </div>
        </>
      )}
    </div>
  );
}

export type { DocumentSidebarProps };