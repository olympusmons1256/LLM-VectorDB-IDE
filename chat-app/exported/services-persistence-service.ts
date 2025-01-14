// services/persistence-service.ts
import type { ProjectState } from '@/types/save-state';
import { withRetry } from '@/utils/retry-utils';

export interface PersistenceOptions {
  autoSave?: boolean;
  saveInterval?: number;
  maxRetries?: number;
  onError?: (error: Error) => void;
  onSaveComplete?: (state: ProjectState) => void;
  validateBeforeSave?: boolean;
}

interface SaveOperation {
  id: string;
  state: Partial<ProjectState>;
  timestamp: number;
  retries: number;
}

export class PersistenceService {
  private saveQueue: SaveOperation[] = [];
  private isSaving = false;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private subscriptions = new Map<string, () => ProjectState>();

  constructor(private options: PersistenceOptions = {}) {
    this.options = {
      autoSave: true,
      saveInterval: 5 * 60 * 1000, // 5 minutes
      maxRetries: 3,
      validateBeforeSave: true,
      ...options
    };

    // Start processing save queue
    this.processSaveQueue();

    // Set up auto-save if enabled
    if (this.options.autoSave) {
      this.startAutoSave();
    }
  }

  watchStore<T extends { getState: () => ProjectState }>(
    store: T,
    storeId: string
  ): () => void {
    // Save initial state
    const currentState = store.getState();
    this.queueSave(storeId, currentState);

    // Set up subscription
    this.subscriptions.set(storeId, () => store.getState());

    // Return cleanup function
    return () => {
      this.subscriptions.delete(storeId);
    };
  }

  async saveState(
    projectId: string,
    state: Partial<ProjectState>
  ): Promise<void> {
    return withRetry(
      async () => {
        const response = await fetch('/api/save-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, state })
        });

        if (!response.ok) {
          throw new Error(`Failed to save state: ${response.statusText}`);
        }
      },
      { maxRetries: this.options.maxRetries }
    );
  }

  async loadState(projectId: string): Promise<ProjectState> {
    return withRetry(
      async () => {
        const response = await fetch(`/api/save-state/${projectId}`);
        if (!response.ok) {
          throw new Error(`Failed to load state: ${response.statusText}`);
        }
        return response.json();
      },
      { maxRetries: this.options.maxRetries }
    );
  }

  queueSave(storeId: string, state: Partial<ProjectState>): void {
    // Add save operation to queue
    this.saveQueue.push({
      id: storeId,
      state,
      timestamp: Date.now(),
      retries: 0
    });

    // Trigger queue processing
    this.processSaveQueue();
  }

  private async processSaveQueue(): Promise<void> {
    if (this.isSaving || this.saveQueue.length === 0) return;

    this.isSaving = true;

    try {
      // Sort queue by timestamp
      this.saveQueue.sort((a, b) => a.timestamp - b.timestamp);

      // Process each operation
      while (this.saveQueue.length > 0) {
        const operation = this.saveQueue[0];

        try {
          await this.saveState(operation.id, operation.state);
          this.saveQueue.shift(); // Remove successful operation
          this.options.onSaveComplete?.(operation.state as ProjectState);
        } catch (error: any) {
          operation.retries++;
          if (operation.retries >= (this.options.maxRetries || 3)) {
            this.saveQueue.shift(); // Remove failed operation
            this.options.onError?.(error);
          }
          // Leave operation in queue for retry if retries remaining
          break;
        }
      }
    } finally {
      this.isSaving = false;

      // If there are still items in the queue, schedule next processing
      if (this.saveQueue.length > 0) {
        setTimeout(() => this.processSaveQueue(), 1000);
      }
    }
  }

  private startAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      // Save state for all subscribed stores
      for (const [storeId, getState] of this.subscriptions.entries()) {
        this.queueSave(storeId, getState());
      }
    }, this.options.saveInterval);
  }

  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  clearQueue(): void {
    this.saveQueue = [];
  }

  async validateStoreState(storeId: string): Promise<boolean> {
    const getState = this.subscriptions.get(storeId);
    if (!getState) return false;

    const currentState = getState();
    
    try {
      // Verify we can serialize the state
      JSON.stringify(currentState);
      
      // Verify required fields
      if (!currentState.messages || !Array.isArray(currentState.messages)) {
        return false;
      }

      // Verify documents structure
      if (!currentState.documents || typeof currentState.documents.types !== 'object') {
        return false;
      }

      // Verify code blocks
      if (!Array.isArray(currentState.codeBlocks)) {
        return false;
      }

      // Verify annotations
      if (!Array.isArray(currentState.annotations)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async forceSync(): Promise<void> {
    // Process any queued saves immediately
    await this.processSaveQueue();

    // Force save current state for all stores
    const savePromises = Array.from(this.subscriptions.entries()).map(
      async ([storeId, getState]) => {
        try {
          await this.saveState(storeId, getState());
        } catch (error) {
          this.options.onError?.(error as Error);
        }
      }
    );

    await Promise.all(savePromises);
  }

  getQueueStatus(): { 
    pending: number; 
    saving: boolean; 
    lastSave?: Date;
  } {
    return {
      pending: this.saveQueue.length,
      saving: this.isSaving,
      lastSave: this.saveQueue[0]?.timestamp ? new Date(this.saveQueue[0].timestamp) : undefined
    };
  }

  getSubscribedStores(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  isStoreSubscribed(storeId: string): boolean {
    return this.subscriptions.has(storeId);
  }
}

// Create and export default instance
const defaultPersistenceService = new PersistenceService({
  autoSave: true,
  saveInterval: 5 * 60 * 1000, // 5 minutes
  maxRetries: 3,
  validateBeforeSave: true
});

export default defaultPersistenceService;