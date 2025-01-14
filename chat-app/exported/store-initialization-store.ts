// store/initialization-store.ts
import { create } from 'zustand';
import { useSaveStateStore } from './save-state-store';
import { useChatStore } from './chat-store';

export type InitializationStage = 
  | 'none'           // Initial state
  | 'auth'           // User authentication
  | 'project'        // Project loading
  | 'config'         // Configuration loading  
  | 'documents'      // Document store initialization
  | 'chat'           // Chat store initialization
  | 'plans'          // Plan manager initialization
  | 'complete';      // All initialization complete

const STAGES: InitializationStage[] = [
  'none',
  'auth',
  'project',
  'config',
  'documents',
  'chat',
  'plans',
  'complete'
];

export interface StageMetadata {
  duration?: number;
  attempts?: number;
  lastError?: string;
  requirements?: string[];
  validation?: {
    checks: string[];
    results: boolean[];
  };
}

export const initializationEventHandlers = {
  onStageStart: (stage: InitializationStage) => {
    console.log(`Starting initialization stage: ${stage}`);
    window.dispatchEvent(new CustomEvent('initStageStart', { detail: { stage } }));
  },

  onStageComplete: (stage: InitializationStage) => {
    console.log(`Completed initialization stage: ${stage}`);
    window.dispatchEvent(new CustomEvent('initStageComplete', { detail: { stage } }));
  },

  onStageError: (stage: InitializationStage, error: Error) => {
    console.error(`Error in initialization stage ${stage}:`, error);
    window.dispatchEvent(new CustomEvent('initStageError', { detail: { stage, error } }));
  },

  onProgressUpdate: (progress: number) => {
    window.dispatchEvent(new CustomEvent('initProgress', { detail: { progress } }));
  }
};

export const stageValidationUtils = {
  validateAuthStage: () => {
    const { currentUser } = useSaveStateStore.getState();
    return Boolean(currentUser?.id);
  },

  validateProjectStage: () => {
    const { activeProject, projects } = useSaveStateStore.getState();
    return Boolean(activeProject && projects[activeProject]);
  },

  validateConfigStage: () => {
    return true; // Allow config stage to pass without validation
  },

  validateDocumentsStage: () => {
    const { activeProject, projects } = useSaveStateStore.getState();
    const project = activeProject ? projects[activeProject] : null;
    return Boolean(project?.metadata.namespace);
  },

  validateChatStage: () => {
    const { messages } = useChatStore.getState();
    return Array.isArray(messages);
  },

  validatePlansStage: () => true
};

export async function validateUserSession(): Promise<boolean> {
  const { currentUser } = useSaveStateStore.getState();
  if (!currentUser) return false;

  try {
    const savedUser = localStorage.getItem('simplifide-current-user');
    if (!savedUser) return false;

    const userData = JSON.parse(savedUser);
    if (userData.id !== currentUser.id) return false;

    const lastActive = new Date(currentUser.lastActive).getTime();
    const now = Date.now();
    const maxInactiveTime = 24 * 60 * 60 * 1000; // 24 hours
    
    return (now - lastActive) < maxInactiveTime;

  } catch (error) {
    console.error('Error validating user session:', error);
    return false;
  }
}

function validateStageTransition(currentStage: InitializationStage, nextStage: InitializationStage): boolean {
  const currentIndex = STAGES.indexOf(currentStage);
  const nextIndex = STAGES.indexOf(nextStage);
  
  if (currentIndex === -1 || nextIndex === -1) {
    console.error('Invalid stage transition:', { currentStage, nextStage });
    return false;
  }

  if (nextIndex < currentIndex) {
    console.error('Cannot move backwards in initialization:', { currentStage, nextStage });
    return false;
  }

  if (nextIndex > currentIndex + 1) {
    console.error('Cannot skip initialization stages:', { currentStage, nextStage });
    return false;
  }

  switch (nextStage) {
    case 'auth':
      return true;

    case 'project':
      return stageValidationUtils.validateAuthStage();

    case 'config':
      return true; // Allow transition to config stage without validation

    case 'documents':
      return stageValidationUtils.validateProjectStage() &&
             stageValidationUtils.validateAuthStage();

    case 'chat':
      return stageValidationUtils.validateDocumentsStage();

    case 'plans':  
      return stageValidationUtils.validateChatStage() &&
             stageValidationUtils.validateDocumentsStage();

    case 'complete':
      return stageValidationUtils.validatePlansStage() &&
             stageValidationUtils.validateChatStage();

    default:
      return false;
  }
}

interface InitializationState {
  stage: InitializationStage;
  error: string | null;
  isLoading: boolean;
  progress: {
    current: number;
    total: number;
    message?: string;  
  };
  metadata: {
    startTime?: string;
    lastStageChange?: string;
    stageHistory: { 
      stage: InitializationStage; 
      timestamp: string;
      metadata?: StageMetadata;
    }[];
  };

  setStage: (stage: InitializationStage) => void;
  advanceStage: () => void;
  resetStage: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setLoading: (isLoading: boolean) => void;
  updateProgress: (current: number, total: number, message?: string) => void;
  
  startInitialization: () => void;
  completeInitialization: () => void;
  validateStage: (stage: InitializationStage) => boolean;
  isStageComplete: (stage: InitializationStage) => boolean;
  getNextStage: () => InitializationStage | null;
}

export const useInitializationStore = create<InitializationState>((set, get) => ({
  stage: 'none',
  error: null,
  isLoading: false,
  progress: {
    current: 0,
    total: 0
  },
  metadata: {
    stageHistory: []
  },

  setStage: (stage) => {
    const timestamp = new Date().toISOString();
    const stageStartTime = performance.now();

    initializationEventHandlers.onStageStart(stage);

    set(state => {
      const lastStage = state.metadata.stageHistory[state.metadata.stageHistory.length - 1];
      const stageDuration = lastStage ? performance.now() - stageStartTime : 0;

      const metadata: StageMetadata = {
        duration: stageDuration,
        attempts: (lastStage?.metadata?.attempts || 0) + 1,
        validation: {
          checks: [],
          results: []
        }
      };

      return {
        stage,
        metadata: {
          ...state.metadata,
          lastStageChange: timestamp,
          stageHistory: [
            ...state.metadata.stageHistory,
            { stage, timestamp, metadata }
          ]
        }
      };
    });

    console.log(`Initialization stage changed to: ${stage}`);
  },

  advanceStage: () => {
    const state = get();
    const currentIndex = STAGES.indexOf(state.stage);
    
    if (currentIndex < 0 || state.stage === 'complete') return;
    
    const nextStage = STAGES[currentIndex + 1];
    if (!nextStage) return;

    if (!validateStageTransition(state.stage, nextStage)) {
      const error = new Error(`Cannot advance to ${nextStage}: validation failed`);
      state.setError(error.message);
      initializationEventHandlers.onStageError(nextStage, error);
      throw error;
    }

    state.setStage(nextStage);
    state.updateProgress(currentIndex + 1, STAGES.length - 1);
    initializationEventHandlers.onStageComplete(state.stage);
  },

  resetStage: () => {
    const timestamp = new Date().toISOString();
    set({
      stage: 'none',
      error: null,
      isLoading: false,
      progress: { current: 0, total: 0 },
      metadata: {
        startTime: timestamp,
        lastStageChange: timestamp,
        stageHistory: []
      }
    });
  },

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  setLoading: (isLoading) => set({ isLoading }),

  updateProgress: (current, total, message) => {
    set(state => ({
      progress: {
        ...state.progress,
        current,
        total,
        message
      }
    }));
    initializationEventHandlers.onProgressUpdate((current / total) * 100);
  },

  startInitialization: async () => {
    const state = get();
    if (state.stage !== 'none') return;

    const timestamp = new Date().toISOString();
    const isValidSession = await validateUserSession();

    set({
      stage: isValidSession ? 'project' : 'auth',
      isLoading: true,
      error: null,
      progress: {
        current: 0,
        total: STAGES.length - 1,
        message: 'Starting initialization...'
      },
      metadata: {
        startTime: timestamp,
        lastStageChange: timestamp,
        stageHistory: []
      }
    });

    console.log('Initialization started');
  },

  completeInitialization: () => {
    const timestamp = new Date().toISOString();
    set({
      stage: 'complete',
      isLoading: false,
      progress: {
        current: STAGES.length - 1,
        total: STAGES.length - 1,
        message: 'Initialization complete'
      },
      metadata: state => ({
        ...state.metadata,
        lastStageChange: timestamp
      })
    });

    console.log('Initialization completed');
  },

  validateStage: (stage) => {
    const state = get();
    const currentIndex = STAGES.indexOf(state.stage);
    const targetIndex = STAGES.indexOf(stage);

    if (currentIndex === -1 || targetIndex === -1) return false;
    if (targetIndex > currentIndex + 1) return false;

    const validationResult = validateStageTransition(state.stage, stage);

    set(state => {
      const currentStageHistory = state.metadata.stageHistory;
      const lastStageIndex = currentStageHistory.length - 1;
      
      if (lastStageIndex >= 0) {
        currentStageHistory[lastStageIndex].metadata = {
          ...currentStageHistory[lastStageIndex].metadata,
          validation: {
            checks: [...(currentStageHistory[lastStageIndex].metadata?.validation?.checks || []), stage],
            results: [...(currentStageHistory[lastStageIndex].metadata?.validation?.results || []), validationResult]
          }
        };
      }

      return {
        metadata: {
          ...state.metadata,
          stageHistory: currentStageHistory
        }
      };
    });

    return validationResult;
  },

  isStageComplete: (stage: InitializationStage) => {
    const state = get();
    const stageIndex = STAGES.indexOf(stage);
    const currentIndex = STAGES.indexOf(state.stage);
    return currentIndex > stageIndex;
  },

  getNextStage: () => {
    const state = get();
    const currentIndex = STAGES.indexOf(state.stage);
    
    if (currentIndex < 0 || state.stage === 'complete') {
      return null;
    }

    return STAGES[currentIndex + 1] || null;
  }
}));

export type { InitializationState };