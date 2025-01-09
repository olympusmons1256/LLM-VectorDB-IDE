// components/DocumentSidebar/DocumentSidebar.tsx
'use client';

import { useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { NamespaceManager, FileTypeFilter, FileUploader, DocumentList } from './internal/components';
import { useDocumentSidebarState } from './internal/state';
import type { DocumentSidebarProps } from './internal/types';
import { useActiveProject } from '@/hooks/use-active-project';

export function DocumentSidebar({ 
  config, 
  onError, 
  onNamespaceChange, 
  currentNamespace, 
  visible 
}: DocumentSidebarProps) {
  const mountedRef = useRef(false);
  const initializeAttemptedRef = useRef(false);
  const {
    isConfigured,
    isLoading,
    loadingState,
    namespaces,
    refreshAll,
    sidebarVisible,
    setSidebarVisible,
    selectedType,
    setSortOrder
  } = useDocumentSidebarState();

  const { activeProject } = useActiveProject();

  // Single initialization on first mount
  useEffect(() => {
    if (!mountedRef.current && !initializeAttemptedRef.current) {
      console.log('DocumentSidebar mounted with config:', {
        isConfigured: !!config?.apiKeys?.pinecone,
        indexName: config?.vectordb?.indexName,
        hasVoyageKey: !!config?.apiKeys?.voyage,
        cloud: config?.vectordb?.cloud,
        region: config?.vectordb?.region
      });

      if (config && activeProject) {
        console.log('Initializing with config...');
        useDocumentSidebarState.getState().initialize(config);
        initializeAttemptedRef.current = true;
      }
    }
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, [config, activeProject]);

  // Handle configuration changes
  useEffect(() => {
    if (config && activeProject && initializeAttemptedRef.current) {
      console.log('Config changed, reinitializing...');
      useDocumentSidebarState.getState().initialize(config);
    }
  }, [config, activeProject]);

  // Handle namespace changes
  useEffect(() => {
    if (currentNamespace && isConfigured) {
      useDocumentSidebarState.getState().refreshDocuments(currentNamespace)
        .catch(error => {
          console.error('Error refreshing documents:', error);
          onError(error.message);
        });
    }
  }, [currentNamespace, isConfigured, onError]);

  if (!activeProject || !visible || !sidebarVisible) {
    return null;
  }

  return (
    <div className="h-[calc(100vh-var(--header-height,64px))] flex flex-col overflow-hidden">
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
          <div className="flex-shrink-0 border-b dark:border-gray-700 p-4">
            <FileTypeFilter />
          </div>
          
          <div className="flex-shrink-0 border-b dark:border-gray-700">
            <FileUploader 
              namespace={currentNamespace} 
              onError={onError}
            />
          </div>

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