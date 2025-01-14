// src/components/DocumentManager/types.ts
import { ComponentProps } from '@/types/canvas';

export type DocumentType = 
  | 'project-structure'
  | 'core-architecture'
  | 'code'
  | 'documentation'
  | 'plan';

export interface DocumentMetadata {
  id: string;
  filename: string;
  type: DocumentType;
  timestamp: string;
  isComplete: boolean;
  size: number;
  lastModified: number;
  contentType?: string;
  language?: string;
  path?: string;
  chunks?: number;
  vectorIds?: string[];
  chunkContent?: string[];
  embeddings?: number[][];
  parentId?: string;
  isFolder?: boolean;
  children?: string[];
}

export interface DocumentFile {
  id: string;
  title: string;
  content: string;
  metadata: DocumentMetadata;
  type?: string;
}

export interface UploadProgress {
  filename: string;
  progress: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
}

export interface NavigationState {
  currentPath: string[];
  expandedDocs: Set<string>;
}

export interface DocumentFilter {
  type?: DocumentType;
  searchTerm?: string;
  sortBy?: 'name' | 'date' | 'size';
  sortDirection?: 'asc' | 'desc';
}

export interface VectorSearchResult {
  documentId: string;
  chunkIndex: number;
  score: number;
  content: string;
  metadata: DocumentMetadata;
}

export interface DocumentState {
  documents: Record<string, DocumentFile>;
  navigation: NavigationState;
  selectedDocumentId: string | null;
  uploads: Record<string, UploadProgress>;
  filter: DocumentFilter;
  error: string | null;
  isLoading: boolean;
}

export interface DocumentManagerProps extends ComponentProps {
  canvasId: string;
  isActive?: boolean;
  onActivate?: () => void;
  onClose?: () => void;
}

export interface DocumentUpdates extends Partial<DocumentFile> {
  metadata?: Partial<DocumentMetadata>;
}