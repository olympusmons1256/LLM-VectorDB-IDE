import { useInitializationStore } from '@/store/initialization-store';
import { useSaveStateStore } from '@/store/save-state-store';
import { useChatStore } from '@/store/chat-store';

interface InitializationError extends Error {
  stage?: string;
}

async function validateUserSession(userData: any): Promise<boolean> {
  if (!userData || !userData.id) return false;

  try {
    const lastActive = new Date(userData.lastActive).getTime();
    const now = Date.now();
    const maxInactiveTime = 24 * 60 * 60 * 1000; // 24 hours
    
    return (now - lastActive) < maxInactiveTime;
  } catch (error) {
    console.error('Error validating user session:', error);
    return false;
  }
}

export async function initializeApplication() {
  const initStore = useInitializationStore.getState();
  const saveStore = useSaveStateStore.getState();
  const chatStore = useChatStore.getState();

  try {
    console.log('Starting initialization...');
    await initStore.startInitialization();

    // Step 1: User Authentication ONLY
    const savedUser = localStorage.getItem('simplifide-current-user');
    if (!savedUser) {
      console.log('No saved user found, moving to auth stage');
      initStore.setStage('auth');
      return;
    }

    try {
      const userData = JSON.parse(savedUser);
      const isValidSession = await validateUserSession(userData);
      
      if (!isValidSession) {
        console.log('User session expired or invalid');
        localStorage.removeItem('simplifide-current-user');
        initStore.setStage('auth');
        return;
      }

      // Set user and proceed
      await saveStore.setCurrentUser(userData);
      console.log('User session restored');
      
      // Store was successfully initialized, move to project stage
      initStore.setStage('project');

      // Check for active project
      const savedProject = localStorage.getItem('simplifide-active-project');
      if (savedProject) {
        try {
          const projectData = JSON.parse(savedProject);
          if (projectData?.id && saveStore.projects[projectData.id]) {
            // Load the active project - this will handle subsequent stages
            await saveStore.loadProject(projectData.id);
          }
        } catch (error) {
          console.error('Error loading saved project:', error);
          localStorage.removeItem('simplifide-active-project');
        }
      }

      return;

    } catch (error) {
      console.error('Error restoring user session:', error);
      localStorage.removeItem('simplifide-current-user');
      localStorage.removeItem('simplifide-active-project');
      initStore.setStage('auth');
      return;
    }

  } catch (error) {
    console.error('Initialization error:', error);
    const initError: InitializationError = new Error(
      error instanceof Error ? error.message : 'Initialization failed'
    );
    initError.stage = initStore.stage;
    initStore.setError(initError.message);
    throw initError;
  }
}

// Event dispatcher for initialization events
export function dispatchInitEvent(type: string, detail: any) {
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

// Cleanup function for initialization
export function cleanupInitialization() {
  // Clean up any initialization-related state or listeners
  useInitializationStore.getState().resetStage();
}