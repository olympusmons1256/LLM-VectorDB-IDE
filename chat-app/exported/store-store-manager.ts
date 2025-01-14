// store/store-manager.ts
import { useChatStore } from './chat-store';
import { useEventStore } from './event-store';
import { PersistenceService, type PersistenceOptions } from '@/services/persistence-service';
import { validateChatState } from '@/utils/store-validation';
import { withRetry } from '@/utils/retry-utils';
import type { ChatEvent } from '@/types/message';
import type { SavedProject, ProjectState } from '@/types/save-state';

interface StoreManagerOptions {
  persistence?: PersistenceOptions;
  validationInterval?: number;
  debug?: boolean;
}

export class StoreManager {
  private persistence: PersistenceService;
  private validationInterval: NodeJS.Timeout | null = null;
  private cleanupFunctions: Array<() => void> = [];
  private debug: boolean;

  constructor(options: StoreManagerOptions = {}) {
    this.debug = options.debug || false;

    // Initialize persistence service
    this.persistence = new PersistenceService({
      autoSave: true,
      saveInterval: 5 * 60 * 1000, // 5 minutes
      validateBeforeSave: true,
      onError: this.handlePersistenceError.bind(this),
      onSaveComplete: this.handleSaveComplete.bind(this),
      ...options.persistence
    });

    // Initialize validation if interval provided
    if (options.validationInterval) {
      this.startValidation(options.validationInterval);
    }

    // Set up event handling
    this.initializeEventHandling();

    // Set up store subscriptions
    this.initializeStoreSubscriptions();

    if (this.debug) {
      console.log('StoreManager initialized with options:', options);
    }
  }

  async initializeProject(project: SavedProject): Promise<void> {
    try {
      const chatStore = useChatStore.getState();
      
      // Initialize chat store
      await chatStore.initializeState({
        apiKeys: project.config.apiKeys,
        vectorDBConfig: project.config.vectorDBConfig,
        namespace: project.metadata.namespace,
        project
      });

      // Start watching the store for changes
      this.persistence.watchStore(useChatStore, project.id);

      // Log initialization
      useEventStore.getState().logEvent('state_loaded', {
        projectId: project.id,
        namespace: project.metadata.namespace
      });

      if (this.debug) {
        console.log('Project initialized:', {
          id: project.id,
          namespace: project.metadata.namespace
        });
      }
    } catch (error) {
      this.handleError('Failed to initialize project', error);
      throw error;
    }
  }

  async saveCurrentState(): Promise<void> {
    const state = useChatStore.getState().getState();
    
    // Validate state before saving
    const validation = validateChatState(state);
    if (!validation.isValid) {
      this.handleError('Invalid state', new Error(JSON.stringify(validation.errors)));
      return;
    }

    try {
      await withRetry(
        () => this.persistence.saveState('current', state),
        { maxRetries: 3 }
      );

      useEventStore.getState().logEvent('state_saved', {
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError('Failed to save state', error);
      throw error;
    }
  }

  private startValidation(interval: number): void {
    this.validationInterval = setInterval(() => {
      const state = useChatStore.getState().getState();
      const validation = validateChatState(state);
      
      if (!validation.isValid) {
        this.handleValidationError(validation.errors);
      }
    }, interval);

    this.cleanupFunctions.push(() => {
      if (this.validationInterval) {
        clearInterval(this.validationInterval);
      }
    });
  }

  private initializeEventHandling(): void {
    const eventStore = useEventStore.getState();

    // Subscribe to chat store changes
    useChatStore.subscribe((state) => {
      // Log specific state changes
      if (state.error) {
        eventStore.logEvent('error_occurred', { error: state.error });
      }
    });

    this.cleanupFunctions.push(
      // Add cleanup for event subscriptions if needed
      () => {}
    );
  }

  private initializeStoreSubscriptions(): void {
    // Set up subscriptions to various stores
    const unsubscribeChat = useChatStore.subscribe((state) => {
      if (this.debug) {
        console.log('Chat store updated:', {
          messagesCount: state.messages.length,
          activePlan: state.activePlan?.id
        });
      }
    });

    const unsubscribeEvents = useEventStore.subscribe((state) => {
      if (this.debug) {
        console.log('New event:', state.events[0]);
      }
    });

    this.cleanupFunctions.push(
      unsubscribeChat,
      unsubscribeEvents
    );
  }

  private handleError(message: string, error: any): void {
    console.error(`StoreManager error: ${message}`, error);
    
    useEventStore.getState().logEvent('error_occurred', {
      error: `${message}: ${error.message}`
    });

    // Set error in chat store
    useChatStore.getState().setError(error.message);
  }

  private handlePersistenceError(error: Error): void {
    this.handleError('Persistence error', error);
  }

  private handleSaveComplete(state: ProjectState): void {
    if (this.debug) {
      console.log('State saved successfully:', {
        messagesCount: state.messages.length,
        timestamp: new Date().toISOString()
      });
    }
  }

  private handleValidationError(errors: any[]): void {
    this.handleError(
      'State validation failed',
      new Error(JSON.stringify(errors))
    );
  }

  cleanup(): void {
    // Stop auto-save
    this.persistence.stopAutoSave();

    // Clear any intervals
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
    }

    // Execute all cleanup functions
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];

    if (this.debug) {
      console.log('StoreManager cleaned up');
    }
  }
}

// Create and export default instance
const defaultManager = new StoreManager({
  persistence: {
    autoSave: true,
    saveInterval: 5 * 60 * 1000
  },
  validationInterval: 60 * 1000, // Validate every minute
  debug: process.env.NODE_ENV === 'development'
});

export default defaultManager;