// services/save-state.ts
import { useSaveStateStore } from '@/store/save-state-store';
import type { 
  ProjectState, 
  SaveStateVersion, 
  SaveStateHistory,
  SavedProject,
  AutoSaveConfig,
  UserProfile
} from '@/types/save-state';

export class SaveStateService {
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private pendingChanges: Set<string> = new Set();

  constructor(
    private config: AutoSaveConfig,
    private onSave: (projectId: string, state: ProjectState) => Promise<void>,
    private onChange: () => void
  ) {}

  // Save state persistence methods
  async saveProjectToIndexedDB(project: SavedProject): Promise<void> {
    try {
      const db = await this.getIndexedDB();
      const tx = db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      await store.put(project);
    } catch (error) {
      console.error('Error saving to IndexedDB:', error);
      throw new Error('Failed to save project to IndexedDB');
    }
  }

  async loadProjectFromIndexedDB(projectId: string): Promise<SavedProject | null> {
    try {
      const db = await this.getIndexedDB();
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const project = await store.get(projectId);
      return project || null;
    } catch (error) {
      console.error('Error loading from IndexedDB:', error);
      throw new Error('Failed to load project from IndexedDB');
    }
  }

  // User profile management
  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      const db = await this.getIndexedDB();
      const tx = db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      await store.put(profile);
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw new Error('Failed to save user profile');
    }
  }

  async loadUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const db = await this.getIndexedDB();
      const tx = db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const profile = await store.get(userId);
      return profile || null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      throw new Error('Failed to load user profile');
    }
  }

  // Auto-save management
  startAutoSave(projectId: string, getCurrentState: () => ProjectState): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    if (!this.config.enabled) return;

    this.autoSaveInterval = setInterval(async () => {
      if (this.pendingChanges.has(projectId)) {
        try {
          const currentState = getCurrentState();
          await this.saveState(projectId, currentState);
          console.log('Auto-saved project:', projectId);
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, this.config.interval);
  }

  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // History and versioning
  async saveVersion(project: SavedProject, description: string): Promise<void> {
    const currentUser = useSaveStateStore.getState().currentUser;
    if (!currentUser) throw new Error('No user logged in');

    const version: SaveStateVersion = {
      version: project.metadata.version + 1,
      timestamp: new Date().toISOString(),
      author: currentUser.id,
      changes: description,
      state: { ...project.state }
    };

    const updatedProject = {
      ...project,
      metadata: {
        ...project.metadata,
        version: version.version,
        updated: version.timestamp
      },
      history: {
        ...project.history,
        versions: [...project.history.versions, version].slice(-this.config.maxVersions),
        current: project.history.versions.length
      }
    };

    await this.saveProjectToIndexedDB(updatedProject);
  }

  async restoreVersion(project: SavedProject, versionNumber: number): Promise<SavedProject> {
    const version = project.history.versions.find(v => v.version === versionNumber);
    if (!version) throw new Error('Version not found');

    return {
      ...project,
      state: version.state,
      metadata: {
        ...project.metadata,
        version: version.version,
        updated: new Date().toISOString()
      },
      history: {
        ...project.history,
        current: project.history.versions.findIndex(v => v.version === versionNumber)
      }
    };
  }

  // Export/Import functionality
  async exportProject(project: SavedProject): Promise<Blob> {
    const exportData = {
      version: 1,
      exported: new Date().toISOString(),
      project: {
        metadata: project.metadata,
        state: project.state,
        history: project.history,
        config: {
          autoSave: project.config.autoSave,
          collaborators: project.config.collaborators
        }
      }
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
  }

  async importProject(file: File): Promise<SavedProject> {
    try {
      const content = await file.text();
      const importData = JSON.parse(content);

      if (!importData.project?.metadata || !importData.project?.state) {
        throw new Error('Invalid project file format');
      }

      const timestamp = new Date().toISOString();
      const currentUser = useSaveStateStore.getState().currentUser;
      
      if (!currentUser) throw new Error('No user logged in');

      return {
        ...importData.project,
        id: this.generateId(),
        metadata: {
          ...importData.project.metadata,
          imported: timestamp,
          updated: timestamp,
          owner: currentUser.id
        }
      };
    } catch (error) {
      console.error('Error importing project:', error);
      throw new Error('Failed to import project: Invalid file format');
    }
  }

  // Database initialization
  private async getIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('simplifideDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = request.result;

        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('owner', 'metadata.owner', { unique: false });
          projectStore.createIndex('updated', 'metadata.updated', { unique: false });
        }

        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
        }
      };
    });
  }

  // Change tracking
  markChanged(projectId: string): void {
    this.pendingChanges.add(projectId);
    this.onChange();
  }

  hasPendingChanges(projectId: string): boolean {
    return this.pendingChanges.has(projectId);
  }

  // Utility methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateProject(project: SavedProject): boolean {
    return Boolean(
      project.id &&
      project.metadata?.name &&
      project.metadata?.owner &&
      project.state
    );
  }
}