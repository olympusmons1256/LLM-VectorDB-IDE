// src/types/canvas.ts
export interface Canvas {
  id: string;
  name: string;
  created: string;
  updated: string;
  owner: string;
  activeComponents: ComponentType[];
  componentState: {
    [K in ComponentType]?: ComponentState[K];
  };
  componentSettings: {
    [K in ComponentType]?: ComponentSettings[K];
  };
  collaborators: Collaborator[];
}

export interface Collaborator {
  id: string;
  role: CollaboratorRole;
  joinedAt: string;
  lastActive?: string;
}

export type CollaboratorRole = 'owner' | 'editor' | 'viewer';

export type ComponentType = 'chat' | 'documents' | 'codeBlocks' | 'plans';

export interface ComponentProps {
  id: string;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Document {
  id: string;
  name: string;
  content: string;
  format: DocumentFormat;
  created: string;
  updated: string;
  version: number;
  metadata?: Record<string, unknown>;
}

export type DocumentFormat = 'text' | 'markdown' | 'code';

export interface CodeBlock {
  id: string;
  name: string;
  content: string;
  language: string;
  created: string;
  updated: string;
  isEditing?: boolean;
  dependencies?: string[];
}

export interface PlanStep {
  id: string;
  description: string;
  completed: boolean;
  createdAt?: string;
  updatedAt?: string;
  dependencies?: string[];
}

export interface Plan {
  id: string;
  title: string;
  description?: string;
  steps: PlanStep[];
  created: string;
  updated: string;
}

export interface ComponentState {
  chat: {
    messages: Message[];
    activeThread: string | null;
  };
  documents: {
    files: Record<string, Document>;
    activeFile: string | null;
  };
  codeBlocks: {
    blocks: CodeBlock[];
    activeBlock: string | null;
  };
  plans: {
    items: Plan[];
    activePlan: string | null;
  };
}

export interface ComponentSettings {
  chat: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  documents: {
    autoSave: boolean;
    saveInterval: number;
    defaultFormat: DocumentFormat;
  };
  codeBlocks: {
    defaultLanguage: string;
    theme: string;
    autoSave: boolean;
  };
  plans: {
    autoComplete: boolean;
    notifications: boolean;
  };
}