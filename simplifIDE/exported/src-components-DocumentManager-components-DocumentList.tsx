// src/components/DocumentManager/components/DocumentList.tsx
import React from 'react';
import { useDocumentStore, useDocumentNavigation } from '../store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Folder, File, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import { DocumentFile } from '../types';
import { formatFileSize } from '../utils';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const DocumentList: React.FC = () => {
  const { 
    currentPath, 
    expandedFolders,
    navigateToFolder,
    toggleFolder,
    getCurrentFolderContents
  } = useDocumentNavigation();
  
  const { removeDocument } = useDocumentStore();
  const [selectedDoc, setSelectedDoc] = React.useState<DocumentFile | null>(null);
  const currentDocs = getCurrentFolderContents();

  const handleFolderClick = (doc: DocumentFile) => {
    if (doc.metadata.isFolder) {
      navigateToFolder(doc.id);
      toggleFolder(doc.id);
    }
  };

  const handleDelete = async (doc: DocumentFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this item?')) {
      await removeDocument(doc.id);
    }
  };

  const renderDocument = (doc: DocumentFile) => {
    const isExpanded = expandedFolders.has(doc.id);
    
    return (
      <div key={doc.id} className="border rounded-lg p-3 mb-2">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => handleFolderClick(doc)}
        >
          <div className="flex items-center space-x-2">
            {doc.metadata.isFolder ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <Folder className="w-4 h-4 text-blue-500" />
              </>
            ) : (
              <File className="w-4 h-4 text-gray-500" />
            )}
            <div>
              <p className="font-medium">{doc.title}</p>
              <p className="text-sm text-gray-500">
                {doc.metadata.isFolder ? (
                  `${doc.metadata.children?.length || 0} items`
                ) : (
                  formatFileSize(doc.metadata.size)
                )}
              </p>
            </div>
          </div>

          <div className="flex space-x-2">
            {!doc.metadata.isFolder && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDoc(doc)}
              >
                Preview
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleDelete(doc, e)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Breadcrumb navigation */}
      {currentPath.length > 0 && (
        <div className="flex items-center space-x-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateToFolder(currentPath[currentPath.length - 2] || '')}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="text-sm text-gray-500">
            {currentPath.map((id, index) => {
              const doc = useDocumentStore.getState().documents[id];
              return (
                <React.Fragment key={id}>
                  {index > 0 && <span className="mx-2">/</span>}
                  <span 
                    className="hover:text-blue-500 cursor-pointer"
                    onClick={() => navigateToFolder(id)}
                  >
                    {doc?.title}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Document list */}
      {currentDocs.length === 0 ? (
        <Alert>
          <AlertDescription>
            No documents found in this location. Upload a document or create a folder to get started.
          </AlertDescription>
        </Alert>
      ) : (
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-2">
            {currentDocs.map(renderDocument)}
          </div>
        </ScrollArea>
      )}

      {/* Document preview dialog */}
      <Dialog 
        open={!!selectedDoc} 
        onOpenChange={() => setSelectedDoc(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[600px] mt-4">
            <pre className="whitespace-pre-wrap p-4 text-sm">
              {selectedDoc?.content}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentList;