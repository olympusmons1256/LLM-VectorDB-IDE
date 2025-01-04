'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Folder, File, Upload, Loader, Plus, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { useIndexes, useNamespaces } from './hooks';
import { useFileUpload } from './hooks';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  path: string;
}

const FileTree = ({ 
  nodes, 
  level = 0 
}: { 
  nodes: FileNode[], 
  level?: number 
}) => {
  return (
    <div style={{ marginLeft: `${level * 16}px` }}>
      {nodes.map((node) => (
        <div key={node.path} className="flex flex-col">
          <div className="flex items-center gap-2 py-1 hover:bg-gray-50 rounded px-2">
            {node.type === 'directory' ? (
              <>
                <Folder className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-sm">{node.name}</span>
              </>
            ) : (
              <>
                <File className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">{node.name}</span>
              </>
            )}
          </div>
          {node.children && node.children.length > 0 && (
            <div className="ml-2 border-l border-gray-200">
              <FileTree nodes={node.children} level={level + 1} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default function FileSystem() {
  const [mounted, setMounted] = useState(false);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<string>('');
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [newIndexName, setNewIndexName] = useState('');
  const [newNamespaceName, setNewNamespaceName] = useState('');
  const [createIndexOpen, setCreateIndexOpen] = useState(false);
  const [createNamespaceOpen, setCreateNamespaceOpen] = useState(false);

  const { 
    indexes, 
    isLoading: indexesLoading, 
    error: indexesError, 
    createIndex, 
    refreshIndexes 
  } = useIndexes();

  const { 
    namespaces, 
    isLoading: namespacesLoading, 
    error: namespacesError, 
    refreshNamespaces 
  } = useNamespaces(selectedIndex);

  const {
    isUploading,
    uploadError,
    uploadProgress,
    uploadFiles,
    setUploadError
  } = useFileUpload(selectedIndex, selectedNamespace);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreateIndex = async () => {
    if (!newIndexName.trim()) return;
    
    const success = await createIndex(newIndexName);
    if (success) {
      setNewIndexName('');
      setCreateIndexOpen(false);
    }
  };

  const handleCreateNamespace = () => {
    if (!newNamespaceName.trim()) return;
    setSelectedNamespace(newNamespaceName);
    setNewNamespaceName('');
    setCreateNamespaceOpen(false);
  };

  const handleIndexSelect = async (indexName: string) => {
    setSelectedIndex(indexName);
    setSelectedNamespace('');
  };

  const processDirectory = async (
    dirHandle: FileSystemDirectoryHandle,
    path = ''
  ): Promise<FileNode[]> => {
    const entries: FileNode[] = [];
    
    for await (const entry of dirHandle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;
      
      if (entry.kind === 'file') {
        entries.push({
          name: entry.name,
          type: 'file',
          path: entryPath
        });
      } else {
        const childEntries = await processDirectory(
          entry as FileSystemDirectoryHandle, 
          entryPath
        );
        entries.push({
          name: entry.name,
          type: 'directory',
          children: childEntries,
          path: entryPath
        });
      }
    }
    
    return entries.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  };

  const getAllFiles = async (
    dirHandle: FileSystemDirectoryHandle,
    path = ''
  ): Promise<[File, string][]> => {
    const files: [File, string][] = [];
    
    for await (const entry of dirHandle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;
      
      if (entry.kind === 'file') {
        const file = await (entry as FileSystemFileHandle).getFile();
        files.push([file, entryPath]);
      } else {
        const childFiles = await getAllFiles(
          entry as FileSystemDirectoryHandle, 
          entryPath
        );
        files.push(...childFiles);
      }
    }
    
    return files;
  };

  const handleDirectorySelect = async () => {
    if (!selectedIndex || !selectedNamespace) {
      setUploadError('Please select both an index and namespace first');
      return;
    }

    try {
      // @ts-ignore
      const directoryHandle = await window.showDirectoryPicker();
      const fileStructure = await processDirectory(directoryHandle);
      setFiles(fileStructure);
      
      const allFiles = await getAllFiles(directoryHandle);
      await uploadFiles(allFiles);
      await refreshNamespaces();
    } catch (error: any) {
      console.error('Error processing directory:', error);
      setUploadError(error.message || 'Failed to process directory');
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <Card className="w-80 p-4 flex flex-col h-[80vh]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Vector Store</h2>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={refreshIndexes}
            disabled={indexesLoading}
          >
            <RefreshCw className={`h-4 w-4 ${indexesLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {indexesError && (
          <Alert variant="destructive">
            <AlertTitle>Error loading indexes</AlertTitle>
            <AlertDescription>{indexesError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>Index</Label>
          <div className="flex gap-2">
            <Select 
              value={selectedIndex} 
              onValueChange={handleIndexSelect}
              disabled={indexesLoading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Choose index..." />
              </SelectTrigger>
              <SelectContent>
                {indexesLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading...
                  </SelectItem>
                ) : indexes?.length > 0 ? (
                  indexes.map(index => (
                    <SelectItem key={index.name} value={index.name}>
                      {index.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No indexes found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            
            <Dialog open={createIndexOpen} onOpenChange={setCreateIndexOpen}>
              <DialogTrigger asChild>
                <Button size="icon" disabled={indexesLoading}>
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Index</DialogTitle>
                  <DialogDescription>
                    Enter a name for your new vector index.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="index-name">Index Name</Label>
                    <Input
                      id="index-name"
                      value={newIndexName}
                      onChange={(e) => setNewIndexName(e.target.value)}
                      placeholder="my-project-index"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleCreateIndex}
                    disabled={!newIndexName.trim()}
                  >
                    Create Index
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {namespacesError && (
          <Alert variant="destructive">
            <AlertTitle>Error loading namespaces</AlertTitle>
            <AlertDescription>{namespacesError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>Namespace</Label>
          <div className="flex gap-2">
            <Select
              value={selectedNamespace}
              onValueChange={setSelectedNamespace}
              disabled={!selectedIndex || namespacesLoading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Choose namespace..." />
              </SelectTrigger>
              <SelectContent>
                {namespacesLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading...
                  </SelectItem>
                ) : namespaces?.length > 0 ? (
                  namespaces.map(namespace => (
                    <SelectItem key={namespace} value={namespace}>
                      {namespace}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No namespaces found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            <Dialog open={createNamespaceOpen} onOpenChange={setCreateNamespaceOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="icon" 
                  disabled={!selectedIndex || namespacesLoading}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Namespace</DialogTitle>
                  <DialogDescription>
                    Enter a name for your new namespace.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="namespace-name">Namespace Name</Label>
                    <Input
                      id="namespace-name"
                      value={newNamespaceName}
                      onChange={(e) => setNewNamespaceName(e.target.value)}
                      placeholder="my-project-namespace"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleCreateNamespace}
                    disabled={!newNamespaceName.trim()}
                  >
                    Create Namespace
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Button 
          onClick={handleDirectorySelect}
          disabled={isUploading || !selectedIndex || !selectedNamespace}
          className="w-full flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Processing Files... {uploadProgress.toFixed(0)}%
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload Directory
            </>
          )}
        </Button>

        {uploadError && (
          <Alert variant="destructive">
            <AlertTitle>Upload Error</AlertTitle>
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        <div className="flex-1 overflow-y-auto border rounded-lg p-2 min-h-[300px]">
          {files.length > 0 ? (
            <FileTree nodes={files} />
          ) : (
            <div className="text-gray-500 text-center py-4">
              No files uploaded
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}