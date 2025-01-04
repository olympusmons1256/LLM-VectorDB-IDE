// components/DocumentSidebar/internal/types.ts
import type { EmbeddingConfig } from '@/services/embedding';
import type { LucideIcon } from 'lucide-react';

export interface DocumentMetadata {
  filename: string;
  type: 'project-structure' | 'core-architecture' | 'code' | 'documentation' | 'plan';
  timestamp: string;
  chunkIndex?: number;
  totalChunks?: number;
  isComplete?: boolean;
  size?: number;
  contentType?: string;
  language?: string;
}

export interface NamespaceStats {
  recordCount: number;
  hasDocumentation: boolean;
  totalSize: number;
}

export interface IndexedDocument {
  metadata?: DocumentMetadata;
  text?: string;
}

export interface DocumentSidebarProps {
  config: EmbeddingConfig;
  onError: (error: string) => void;
  onNamespaceChange: (namespace: string) => void;
  currentNamespace: string;
  visible: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  status: string;
  progress?: number;
  error?: string;
}

export interface FileTypeInfo {
  type: string;
  label: string;
  pattern: RegExp;
}