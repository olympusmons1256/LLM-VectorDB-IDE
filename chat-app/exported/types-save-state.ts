// types/save-state.ts

export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    layout: 'default' | 'compact' | 'wide' | 'stacked';
    autoSave: boolean;
    autoSaveInterval: number;
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
    metadata: ProjectMetadata;
    messages: Message[];
    activePlan: Plan | null;
    documents: {
      types: Record<string, number>;
      lastRefreshed?: string;
    };
    codeBlocks: CodeBlock[];
    annotations: CodeAnnotation[];
  }
  
  export interface SaveStateHistory {
    projectId: string;
    versions: SaveStateVersion[];
    current: number;
  }
  
  export interface SaveStateOperations {
    save: (state: ProjectState) => Promise<void>;
    load: (projectId: string) => Promise<ProjectState>;
    revert: (projectId: string, version: number) => Promise<ProjectState>;
    export: (projectId: string) => Promise<Blob>;
    import: (file: File) => Promise<ProjectState>;
  }
  
  export interface AutoSaveConfig {
    enabled: boolean;
    interval: number;
    maxVersions: number;
  }
  
  export interface SavedProject {
    id: string;
    metadata: ProjectMetadata;
    history: SaveStateHistory;
    state: ProjectState;
    config: {
      autoSave: AutoSaveConfig;
      collaborators: {
        id: string;
        role: 'owner' | 'editor' | 'viewer';
      }[];
    };
  }