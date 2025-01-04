'use client';

import { useState, useCallback, useEffect } from 'react';
import type { PineconeIndex } from '@/lib/pinecone-manager';

export function useIndexes() {
  const [indexes, setIndexes] = useState<PineconeIndex[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIndexes = useCallback(async () => {
    try {
      console.log('Fetching indexes...');
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/indexes');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received indexes:', data);
      setIndexes(data.indexes || []);
    } catch (err: any) {
      console.error('Error fetching indexes:', err);
      setError(err.message || 'Failed to fetch indexes');
      setIndexes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchIndexes();
  }, [fetchIndexes]);

  const createIndex = async (name: string) => {
    try {
      setError(null);
      const response = await fetch('/api/indexes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 409) {
          setError(`Index "${name}" already exists`);
        } else {
          setError(data.error || 'Failed to create index');
        }
        return false;
      }
      
      await fetchIndexes();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to create index');
      return false;
    }
  };

  return { 
    indexes, 
    isLoading, 
    error, 
    refreshIndexes: fetchIndexes, 
    createIndex 
  };
}

export function useNamespaces(indexName: string | null) {
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNamespaces = useCallback(async () => {
    if (!indexName) {
      setNamespaces([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/namespaces?index=${indexName}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setNamespaces(data.namespaces || []);
    } catch (err: any) {
      console.error('Error fetching namespaces:', err);
      setError(err.message || 'Failed to fetch namespaces');
      setNamespaces([]);
    } finally {
      setIsLoading(false);
    }
  }, [indexName]);

  // Fetch namespaces when index changes
  useEffect(() => {
    if (indexName) {
      fetchNamespaces();
    }
  }, [indexName, fetchNamespaces]);

  return { 
    namespaces, 
    isLoading, 
    error, 
    refreshNamespaces: fetchNamespaces 
  };
}

export function useFileUpload(selectedIndex: string, selectedNamespace: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const uploadFiles = async (files: [File, string][]) => {
    if (!selectedIndex || !selectedNamespace) {
      throw new Error('Please select both an index and namespace first');
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const total = files.length;
      let completed = 0;

      for (const [file, path] of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', path);
        formData.append('index', selectedIndex);
        formData.append('namespace', selectedNamespace);

        const response = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${path}`);
        }

        completed++;
        setUploadProgress((completed / total) * 100);
      }
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload files');
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    isUploading,
    uploadError,
    uploadProgress,
    uploadFiles,
    setUploadError
  };
}