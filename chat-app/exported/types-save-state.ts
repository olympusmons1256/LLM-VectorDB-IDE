// types/save-state.ts
import type { Message } from '@/types/message';
import type { Plan } from '@/services/plans';
import type { CodeBlock, CodeAnnotation } from '@/types/code-block';
import type { LayoutMode } from '@/components/layout/types';
import type { VectorDBConfig } from '@/types/settings';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  layout: 'default' | 'compact' | 'wide' | 'stacked';
  autoSave: boolean;
  autoSaveInterval: number;
  showProjectPath: boolean;
  showRecentProjects: boolean;
}

export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  preferences: UserPreferences;
  lastActive: string;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  created: string;
  updated: string;
  owner: string;
  collaborators: string[];
  tags: string[];
  namespace: string;
  version: number;
}

export interface SaveStateVersion {
  version: number;
  timestamp: string;
  author: string;
  changes: string;
  state: ProjectState;
}

export interface ProjectState {
  messages: Message[];
  activePlan: Plan | null;
  documents: {
    types: Record<string, number>;
    lastRefreshed?: string;
    selectedType?: string;
  };
  codeBlocks: CodeBlock[];
  annotations: CodeAnnotation[];
}

export interface SaveStateHistory {
  projectId: string;
  versions: SaveStateVersion[];
  current: number;
}

export interface AutoSaveConfig {
  enabled: boolean;
  interval: number;
  maxVersions: number;
}

export interface ProjectConfig {
  apiKeys: {
    anthropic: string;
    openai: string;
    pinecone: string;
    voyage: string;
  };
  vectorDBConfig: VectorDBConfig;
  autoSave: boolean;
  collaborators: {
    id: string;
    role: 'owner' | 'editor' | 'viewer';
  }[];
}

export interface SavedProject {
  id: string;
  metadata: ProjectMetadata;
  history: SaveStateHistory;
  state: ProjectState;
  config: ProjectConfig;
}