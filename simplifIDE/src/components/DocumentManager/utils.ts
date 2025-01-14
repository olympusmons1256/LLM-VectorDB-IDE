// src/components/DocumentManager/utils.ts
import { DocumentType, DocumentMetadata } from './types';

export function detectDocumentType(filename: string, content: string): DocumentType {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  // Project structure files
  if (['package.json', 'tsconfig.json', 'next.config.js', 'webpack.config.js'].includes(filename)) {
    return 'project-structure';
  }
  
  // Architecture documentation
  if (content.toLowerCase().includes('architecture') || 
      content.toLowerCase().includes('system design') ||
      content.toLowerCase().includes('component diagram')) {
    return 'core-architecture';
  }
  
  // Code files
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cpp', 'cs', 'go', 'rs'].includes(extension || '')) {
    return 'code';
  }
  
  // Plan files
  if (content.toLowerCase().includes('todo') || 
      content.toLowerCase().includes('roadmap') ||
      filename.toLowerCase().includes('plan')) {
    return 'plan';
  }
  
  // Default to documentation
  return 'documentation';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, exponent)).toFixed(1);
  
  return `${size} ${units[exponent]}`;
}

export function detectLanguage(filename: string): string | undefined {
  const extension = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: 'TypeScript',
    tsx: 'TypeScript React',
    js: 'JavaScript',
    jsx: 'JavaScript React',
    py: 'Python',
    java: 'Java',
    cpp: 'C++',
    cs: 'C#',
    go: 'Go',
    rs: 'Rust',
    php: 'PHP',
    rb: 'Ruby',
    swift: 'Swift',
    kt: 'Kotlin'
  };
  
  return extension ? languageMap[extension] : undefined;
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function generateDocumentMetadata(
  file: File, 
  parentId?: string
): DocumentMetadata {
  return {
    id: crypto.randomUUID(),
    filename: file.name,
    type: 'documentation',
    timestamp: new Date().toISOString(),
    isComplete: true,
    size: file.size,
    lastModified: file.lastModified,
    contentType: file.type,
    language: detectLanguage(file.name),
    path: file.webkitRelativePath || undefined,
    isFolder: false,
    parentId,
    children: []
  };
}

export function generateFolderMetadata(
  name: string,
  parentId?: string
): DocumentMetadata {
  return {
    id: crypto.randomUUID(),
    filename: name,
    type: 'project-structure',
    timestamp: new Date().toISOString(),
    isComplete: true,
    size: 0,
    lastModified: Date.now(),
    isFolder: true,
    parentId,
    children: []
  };
}

export function getPathFromMetadata(metadata: DocumentMetadata, documents: Record<string, DocumentMetadata>): string[] {
  const path: string[] = [];
  let current = metadata;
  
  while (current.parentId) {
    const parent = documents[current.parentId];
    if (!parent) break;
    path.unshift(parent.filename);
    current = parent;
  }
  
  path.push(metadata.filename);
  return path;
}

export function sortDocuments<T extends { metadata: DocumentMetadata }>(
  documents: T[],
  sortBy: 'name' | 'date' | 'size' = 'date',
  direction: 'asc' | 'desc' = 'desc'
): T[] {
  return [...documents].sort((a, b) => {
    // Folders always come first
    if (a.metadata.isFolder && !b.metadata.isFolder) return -1;
    if (!a.metadata.isFolder && b.metadata.isFolder) return 1;

    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.metadata.filename.localeCompare(b.metadata.filename);
        break;
      case 'date':
        comparison = new Date(b.metadata.timestamp).getTime() - 
                    new Date(a.metadata.timestamp).getTime();
        break;
      case 'size':
        comparison = b.metadata.size - a.metadata.size;
        break;
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });
}