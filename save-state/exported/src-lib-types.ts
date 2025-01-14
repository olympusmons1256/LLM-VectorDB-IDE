// src/lib/types.ts
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface ProjectMember {
  userId: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
}

export interface Project {
  id: string;
  name: string;
  userId: string; // Owner's user ID
  members: ProjectMember[];
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  getUserByEmail: (email: string) => User | null;
  createInvitedUser: (email: string, name?: string) => Promise<User>;
}

export interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  selectProject: (project: Project) => void;
  createProject: (name: string) => Promise<Project>;
  shareProject: (projectId: string, email: string, role?: ProjectMember['role']) => Promise<void>;
}

export interface SaveStateContextType {
  saveState: (key: string, value: any) => void;
  loadState: (key: string) => any;
  clearState: () => void;
  getCurrentState: () => Record<string, any>;
}