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
    console.log('Current namespaces state:', namespaces);
    
    if (config) {
      console.log('Initializing with config...');
      initialize(config);
    }
  }, [config, initialize, namespaces]);

  useEffect(() => {
    console.log('Configuration status changed:', {
      isConfigured,
      isLoading,
      loadingState,
      currentNamespace,
      namespaceCount: Object.keys(namespaces).length
    });
  }, [isConfigured, isLoading, loadingState, currentNamespace, namespaces]);

  if (!visible) {
    console.log('DocumentSidebar hidden');
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 border-b p-4">
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
            onNamespaceChange={(namespace) => {
              console.log('Namespace selected:', namespace);
              onNamespaceChange(namespace);
            }}
            onError={onError}
          />
        )}
      </div>

      {isConfigured && currentNamespace && (
        <>
          <div className="flex-shrink-0 border-b p-4">
            <FileTypeFilter />
          </div>
          
          <div className="flex-shrink-0 border-b">
            <FileUploader 
              namespace={currentNamespace} 
              onError={onError}
            />
          </div>

          <div className="flex-1 overflow-hidden">
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