// components/DocumentSidebar/internal/components/FileUploader.tsx
'use client';

import { useState } from 'react';
import { FileUp, FolderUp, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useDocumentSidebarState } from '../state';

interface FileUploaderProps {
  namespace: string;
  onError: (error: string) => void;
}

export function FileUploader({ namespace, onError }: FileUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, fileName: '' });
  const { config, refreshDocuments } = useDocumentSidebarState();
  const { toast } = useToast();

  const handleFiles = async (files: FileList) => {
    if (!files.length) return;
    
    setIsProcessing(true);
    setUploadProgress({ current: 0, total: files.length, fileName: '' });

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => ({
          ...prev,
          fileName: file.name,
          current: i
        }));

        const response = await fetch('/api/vector', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'process_document',
            config,
            text: await file.text(),
            filename: file.name,
            namespace
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to process ${file.name}`);
        }

        toast({
          title: 'File Processed',
          description: `Successfully processed: ${file.name}`
        });
      }
    } catch (error: any) {
      console.error('Error processing files:', error);
      onError(error.message);
    } finally {
      setIsProcessing(false);
      setUploadProgress({ current: 0, total: 0, fileName: '' });
      await refreshDocuments(namespace);
    }
  };

  return (
    <div className="p-4 space-y-2">
      <label className="flex items-center justify-center gap-2 p-2 border-2 border-dashed rounded-sm w-full cursor-pointer hover:bg-secondary transition-colors">
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {uploadProgress.fileName ? (
              <span className="text-sm truncate">
                Processing: {uploadProgress.fileName}
              </span>
            ) : 'Processing...'}
          </>
        ) : (
          <>
            <FileUp className="h-4 w-4" />
            <span className="text-sm">Upload Files</span>
          </>
        )}
        <input
          type="file"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={isProcessing}
          className="hidden"
          multiple
        />
      </label>

      <label className="flex items-center justify-center gap-2 p-2 border-2 border-dashed rounded-sm w-full cursor-pointer hover:bg-secondary transition-colors">
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Processing directory...</span>
          </>
        ) : (
          <>
            <FolderUp className="h-4 w-4" />
            <span className="text-sm">Upload Directory</span>
          </>
        )}
        <input
          type="file"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={isProcessing}
          className="hidden"
          {...{ webkitdirectory: '', directory: '' }}
          multiple
        />
      </label>
    </div>
  );
}