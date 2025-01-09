// types/workspace-state.ts
import type { Message } from '@/types/message';
import type { Plan } from '@/services/plans';
import type { CodeBlock, CodeAnnotation } from '@/types/code-block';

export interface DocumentState {
  namespace: string;
  loadedDocuments: {
    filename: string;
    content: string;
    metadata: {
      type: 'project-structure' | 'core-architecture' | 'code' | 'documentation' | 'plan';
      lastModified: string;
      size: number;
      language?: string;
      path?: string;
    };
  }[];
  documentTypes: Record<string, number>; // Count of each document type
  lastRefreshed: string;
}

export interface ChatState {
  messages: Message[];
  annotations: CodeAnnotation[];
  references: {
    messageId: string;
    blockIds: string[];
    planIds: string[];
  }[];
}

export interface CodeBlockState {
  blocks: {
    id: string;
    language: string;
    code: string;
    sourceType: 'chat' | 'document';
    sourceId: string;  // messageId or documentId
    metadata?: {
      filename?: string;
      path?: string;
      startLine?: number;
      endLine?: number;
    };
  }[];
  annotations: {
    blockId: string;
    messageId: string;
    text: string;
    line: number;
  }[];
}

export interface PlanState {
  activePlan: Plan | null;
  plans: Plan[];
  history: {
    planId: string;
    changes: {
      timestamp: string;
      type: 'status' | 'step' | 'metadata';
      authorId: string;
      details: string;
    }[];
  }[];
}

export interface WorkspaceState {
  documents: DocumentState;
  chat: ChatState;
  codeBlocks: CodeBlockState;
  plans: PlanState;
  metadata: {
    lastModified: string;
    modifiedBy: string;
    version: number;
  };
}

export interface WorkspaceMetadata {
  name: string;
  created: string;
  updated: string;
  owner: string;
  namespace: string;
  version: number;
}

export interface StoredWorkspace {
  id: string;
  state: WorkspaceState;
  metadata: WorkspaceMetadata;
}

export type WorkspaceValidationError = {
  field: string;
  error: string;
};