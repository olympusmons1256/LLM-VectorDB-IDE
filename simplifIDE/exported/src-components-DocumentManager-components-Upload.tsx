// src/components/DocumentManager/components/Upload.tsx
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Folder } from 'lucide-react';
import { useUploadProgress } from '../store';

interface UploadButtonsProps {
  onFileSelect: (files: FileList) => void;
  isUploading: boolean;
}

export const UploadButtons: React.FC<UploadButtonsProps> = ({ 
  onFileSelect, 
  isUploading 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center space-x-2">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => e.target.files && onFileSelect(e.target.files)}
        multiple
      />
      <input
        type="file"
        ref={folderInputRef}
        className="hidden"
        onChange={(e) => e.target.files && onFileSelect(e.target.files)}
        {...{ directory: "", webkitdirectory: "" } as any}
      />
      <Button
        variant="outline"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-4 h-4 mr-2" />
        Upload Files
      </Button>
      <Button
        variant="outline"
        disabled={isUploading}
        onClick={() => folderInputRef.current?.click()}
      >
        <Folder className="w-4 h-4 mr-2" />
        Upload Folder
      </Button>
    </div>
  );
};

export const UploadProgressBar: React.FC = () => {
  const { activeUploads, totalProgress } = useUploadProgress();

  if (activeUploads.length === 0) return null;

  return (
    <div className="space-y-4">
      {activeUploads.map((upload) => (
        <div key={upload.filename} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">{upload.filename}</span>
            <span className="text-gray-500">{Math.round(upload.progress)}%</span>
          </div>
          <Progress value={upload.progress} />
          {upload.error && (
            <p className="text-sm text-red-500">{upload.error}</p>
          )}
        </div>
      ))}

      {activeUploads.length > 1 && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Overall Progress</span>
            <span className="text-gray-500">{Math.round(totalProgress)}%</span>
          </div>
          <Progress value={totalProgress} />
        </div>
      )}
    </div>
  );
};