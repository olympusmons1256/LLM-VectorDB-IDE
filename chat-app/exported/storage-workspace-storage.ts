// storage/workspace-storage.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { 
  WorkspaceState, 
  WorkspaceMetadata, 
  StoredWorkspace 
} from '@/types/workspace-state';

interface WorkspaceDB extends DBSchema {
  workspaces: {
    key: string;
    value: StoredWorkspace;
    indexes: { 'by-owner': string; 'by-namespace': string; };
  };
  settings: {
    key: string;
    value: any;
  };
  backups: {
    key: string;
    value: StoredWorkspace & { backupTimestamp: string; };
  };
}

const DB_VERSION = 1;
const DB_NAME = 'simplifide-workspace';

class WorkspaceStorage {
  private db: IDBPDatabase<WorkspaceDB> | null = null;
  private static instance: WorkspaceStorage;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): WorkspaceStorage {
    if (!WorkspaceStorage.instance) {
      WorkspaceStorage.instance = new WorkspaceStorage();
    }
    return WorkspaceStorage.instance;
  }

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise(async (resolve, reject) => {
      try {
        this.db = await openDB<WorkspaceDB>(DB_NAME, DB_VERSION, {
          upgrade(db, oldVersion, newVersion, transaction, event) {
            if (!db.objectStoreNames.contains('workspaces')) {
              const workspaceStore = db.createObjectStore('workspaces', { 
                keyPath: 'id' 
              });
              workspaceStore.createIndex('by-owner', 'metadata.owner');
              workspaceStore.createIndex('by-namespace', 'metadata.namespace');
            }

            if (!db.objectStoreNames.contains('settings')) {
              db.createObjectStore('settings', { keyPath: 'key' });
            }

            if (!db.objectStoreNames.contains('backups')) {
              db.createObjectStore('backups', { 
                keyPath: 'id' 
              });
            }

            console.log(`Database upgraded from version ${oldVersion} to ${newVersion}`);
          },
          blocked(currentVersion, blockedVersion, event) {
            console.error('Database upgrade blocked:', {
              currentVersion,
              blockedVersion,
              event
            });
            reject(new Error('Database upgrade blocked by other sessions'));
          },
          blocking(currentVersion, blockedVersion, event) {
            console.warn('This connection is blocking a database upgrade');
          },
          terminated() {
            console.error('Database connection terminated unexpectedly');
            this.db = null;
            this.initPromise = null;
          }
        });
        resolve();
      } catch (error) {
        console.error('Failed to initialize database:', error);
        reject(error);
        this.initPromise = null;
      }
    });

    return this.initPromise;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('Database failed to initialize');
    }
  }

  async saveWorkspace(
    id: string, 
    state: WorkspaceState, 
    metadata: Omit<WorkspaceMetadata, 'created' | 'updated'>
  ): Promise<void> {
    await this.ensureInitialized();

    const timestamp = new Date().toISOString();
    const existingWorkspace = await this.db!.get('workspaces', id);

    const workspace: StoredWorkspace = {
      id,
      state,
      metadata: {
        ...metadata,
        created: existingWorkspace?.metadata.created || timestamp,
        updated: timestamp,
        version: (existingWorkspace?.metadata.version || 0) + 1
      }
    };

    // Create backup of existing workspace
    if (existingWorkspace) {
      await this.db!.put('backups', {
        ...existingWorkspace,
        backupTimestamp: timestamp
      });
    }

    // Save new workspace state
    await this.db!.put('workspaces', workspace);
  }

  async loadWorkspace(id: string): Promise<StoredWorkspace> {
    await this.ensureInitialized();
    const workspace = await this.db!.get('workspaces', id);
    if (!workspace) {
      throw new Error(`Workspace not found: ${id}`);
    }
    return workspace;
  }

  async deleteWorkspace(id: string): Promise<void> {
    await this.ensureInitialized();
    
    // Create final backup before deletion
    const workspace = await this.db!.get('workspaces', id);
    if (workspace) {
      await this.db!.put('backups', {
        ...workspace,
        backupTimestamp: new Date().toISOString()
      });
    }

    await this.db!.delete('workspaces', id);
  }

  async listWorkspaces(ownerId?: string): Promise<StoredWorkspace[]> {
    await this.ensureInitialized();

    if (ownerId) {
      return await this.db!.getAllFromIndex('workspaces', 'by-owner', ownerId);
    } else {
      return await this.db!.getAll('workspaces');
    }
  }

  async getWorkspacesByNamespace(namespace: string): Promise<StoredWorkspace[]> {
    await this.ensureInitialized();
    return await this.db!.getAllFromIndex('workspaces', 'by-namespace', namespace);
  }

  async saveSettings(key: string, value: any): Promise<void> {
    await this.ensureInitialized();
    await this.db!.put('settings', { key, value });
  }

  async loadSettings<T>(key: string): Promise<T | null> {
    await this.ensureInitialized();
    const setting = await this.db!.get('settings', key);
    return setting?.value || null;
  }

  async restoreBackup(
    workspaceId: string, 
    backupTimestamp: string
  ): Promise<StoredWorkspace> {
    await this.ensureInitialized();

    const backup = await this.db!.get('backups', workspaceId);
    if (!backup || backup.backupTimestamp !== backupTimestamp) {
      throw new Error('Backup not found');
    }

    // Restore the backup as the current workspace
    const { backupTimestamp: _, ...workspaceData } = backup;
    await this.db!.put('workspaces', {
      ...workspaceData,
      metadata: {
        ...workspaceData.metadata,
        updated: new Date().toISOString(),
        version: workspaceData.metadata.version + 1
      }
    });

    return await this.loadWorkspace(workspaceId);
  }

  async getBackups(workspaceId: string): Promise<Array<{
    timestamp: string;
    metadata: WorkspaceMetadata;
  }>> {
    await this.ensureInitialized();
    const backups = await this.db!.getAll('backups');
    return backups
      .filter(b => b.id === workspaceId)
      .map(({ backupTimestamp, metadata }) => ({
        timestamp: backupTimestamp,
        metadata
      }));
  }

  async cleanup(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initPromise = null;
  }
}