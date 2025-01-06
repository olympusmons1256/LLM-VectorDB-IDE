// components/DocumentSidebar/internal/components/DocumentList.tsx
import { Loader2 } from 'lucide-react';
import { useDocumentSidebarState } from '../state';
import { DocumentListItem } from './DocumentListItem';

interface DocumentListProps {
  namespace: string;
  loadingState: {
    isLoading: boolean;
    status: string;
    progress?: number;
    error?: string;
  };
}

export function DocumentList({ namespace, loadingState }: DocumentListProps) {
  const { documents, selectedType, sortOrder, setSortOrder } = useDocumentSidebarState();
  const docs = documents[namespace] || [];

  const filteredDocs = docs.filter(doc => {
    if (!selectedType) return true;
    return doc.metadata?.type === selectedType;
  });

  const sortedDocs = [...filteredDocs].sort((a, b) => {
    const timeA = new Date(a?.metadata?.timestamp || 0).getTime();
    const timeB = new Date(b?.metadata?.timestamp || 0).getTime();
    return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
  });

  if (loadingState.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-3" />
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {loadingState.status}
        </div>
        {loadingState.progress !== undefined && (
          <div className="w-48 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${loadingState.progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  if (loadingState.error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {loadingState.error}
      </div>
    );
  }

  if (sortedDocs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No documents found{selectedType ? ` in ${selectedType}` : ''}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <span className="text-sm text-gray-500">
          {sortedDocs.length} document{sortedDocs.length === 1 ? '' : 's'}
        </span>
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Sort: {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4">
        <div className="space-y-1 py-2">
          {sortedDocs.map((doc, idx) => (
            <DocumentListItem 
              key={`${doc.metadata?.filename}-${idx}`}
              document={doc}
            />
          ))}
        </div>
      </div>
    </div>
  );
}