// components/DocumentSidebar/internal/components/NamespaceManager.tsx
import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useDocumentSidebarState } from '../state';
import { formatFileSize } from '../utils/formatting';

interface NamespaceManagerProps {
  currentNamespace: string;
  onNamespaceChange: (namespace: string) => void;
  onError: (error: string) => void;
}

export function NamespaceManager({
  currentNamespace,
  onNamespaceChange,
  onError
}: NamespaceManagerProps) {
  const [showNewNamespaceInput, setShowNewNamespaceInput] = useState(false);
  const [newNamespaceName, setNewNamespaceName] = useState('');
  const [namespaceToDelete, setNamespaceToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { namespaces, config } = useDocumentSidebarState();

  const handleCreateNamespace = async () => {
    if (!newNamespaceName.trim()) {
      onError('Namespace name cannot be empty');
      return;
    }
  
    try {
      console.log('Creating namespace:', newNamespaceName);
      const response = await fetch('/api/vector', {
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

      await useDocumentSidebarState.getState().refreshNamespaces();

    } catch (error: any) {
      console.error('Error creating namespace:', error);
      onError(error.message);
    }
  };

  const handleDeleteNamespace = async (namespace: string) => {
    try {
      console.log('Deleting namespace:', namespace);
      setIsDeleting(true);
      
      const response = await fetch('/api/vector', {
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

      if (currentNamespace === namespace) {
        onNamespaceChange('');
      }

      await useDocumentSidebarState.getState().refreshNamespaces();

    } catch (error: any) {
      console.error('Error deleting namespace:', error);
      onError(`Failed to delete namespace: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setNamespaceToDelete(null);
    }
  };

  const handleNamespaceChange = async (namespace: string) => {
    console.log('Namespace change triggered:', namespace);
    onNamespaceChange(namespace);

    // Immediately refresh documents for the new namespace
    const documentState = useDocumentSidebarState.getState();
    if (documentState.isConfigured && namespace) {
      console.log('Refreshing documents for new namespace:', namespace);
      try {
        await documentState.refreshDocuments(namespace);
      } catch (error) {
        console.error('Error refreshing documents:', error);
        onError('Failed to load namespace documents');
      }
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">Namespace</label>
      <div className="flex items-center gap-2">
        <select
          value={currentNamespace}
          onChange={(e) => handleNamespaceChange(e.target.value)}
          className="flex-1 p-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <option value="">Select a namespace</option>
          {Object.entries(namespaces).map(([namespace, stats]) => (
            <option key={namespace} value={namespace}>
              {namespace} ({stats?.recordCount || 0} files, {formatFileSize(stats?.totalSize)})
            </option>
          ))}
        </select>
        
        {currentNamespace && (
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
    </div>
  );
}