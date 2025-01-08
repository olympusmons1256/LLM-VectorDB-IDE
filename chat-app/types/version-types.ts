// types/version-types.ts
import type { ProjectState } from '@/store/chat-store';

export interface VersionMetadata {
  version: number;
  timestamp: string;
  author: string;
  description: string;
  conflictResolution?: {
    resolvedBy: string;
    timestamp: string;
    originalVersions: number[];
  };
}

export interface ProjectVersion extends VersionMetadata {
  state: ProjectState;
}

export interface ConflictInfo {
  versions: ProjectVersion[];
  lastCommonVersion: ProjectVersion;
  changes: {
    [key: string]: {
      path: string[];
      value: any;
      author: string;
      timestamp: string;
    }[];
  };
}