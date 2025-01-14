// store/save-state-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useChatStore } from './chat-store';
import { useInitializationStore } from './initialization-store';
import { validateUserProfile, validateProjectState, ensureValidProject } from '@/utils/store-validation';
import type { 
  ProjectState, 
  SaveStateHistory, 
  UserProfile, 
  ProjectMetadata,
  SavedProject,
  AutoSaveConfig
} from '@/types/save-state';

interface SaveStateStore {
  // User state
  currentUser: UserProfile | null;
  projects: Record<string, SavedProject>;
  activeProject: string | null;

  // Save state tracking
  pendingChanges: boolean;
  lastSaved: string | null;
  autoSaveEnabled: boolean;
  autoSaveInterval: NodeJS.Timeout | null;

  // Actions
  initializeUserSession: () => Promise<void>;
  setCurrentUser: (user: UserProfile | null) => void;
  createProject: (metadata: Partial<ProjectMetadata>) => Promise<string>;
  loadProject: (projectId: string) => Promise<void>;
  saveProject: (projectId: string, state: Partial<ProjectState>) => Promise<void>;
  updateProjectMetadata: (projectId: string, metadata: Partial<ProjectMetadata>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  setActiveProject: (projectId: string | null) => void;
  setPendingChanges: (hasPendingChanges: boolean) => void;
  toggleAutoSave: (enabled?: boolean) => void;
  exportProject: (projectId: string) => Promise<Blob>;
  importProject: (file: File) => Promise<string>;
  initializeAutoSave: () => void;
  cleanupAutoSave: () => void;
}

const DEFAULT_AUTO_SAVE_CONFIG: AutoSaveConfig = {
  enabled: true,
  interval: 5 * 60 * 1000,
  maxVersions: 10
};

const generateId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `proj_${timestamp}_${random}`;
};

export const useSaveStateStore = create<SaveStateStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentUser: null,
      projects: {},
      activeProject: null,
      pendingChanges: false,
      lastSaved: null,
      autoSaveEnabled: true,
      autoSaveInterval: null,

      // Initialize user session and check for existing session
      initializeUserSession: async () => {
        const initStore = useInitializationStore.getState();
        try {
          // Check for existing session
          const savedUser = localStorage.getItem('simplifide-current-user');
          if (savedUser) {
            const userData = JSON.parse(savedUser);
            const validation = validateUserProfile(userData);
            if (validation.isValid) {
              // Set current user and advance to project stage
              set({ currentUser: userData });
              initStore.setStage('project');

              // Check for active project
              const savedProject = localStorage.getItem('simplifide-active-project');
              if (savedProject) {
                const projectData = JSON.parse(savedProject);
                if (projectData?.id && get().projects[projectData.id]) {
                  // Load the active project
                  await get().loadProject(projectData.id);
                }
              }
              return;
            }
          }

          // No valid session found, stay in auth stage
          initStore.setStage('auth');
        } catch (error) {
          console.error('Error initializing user session:', error);
          localStorage.removeItem('simplifide-current-user');
          localStorage.removeItem('simplifide-active-project');
          initStore.setStage('auth');
          throw error;
        }
      },

      setCurrentUser: (user) => {
        if (user) {
          const validation = validateUserProfile(user);
          if (!validation.isValid) {
            throw new Error(`Invalid user profile: ${validation.errors.map(e => e.message).join(', ')}`);
          }
        }

        // Save user to local storage
        if (user) {
          localStorage.setItem('simplifide-current-user', JSON.stringify(user));
        } else {
          localStorage.removeItem('simplifide-current-user');
          localStorage.removeItem('simplifide-active-project');
        }

        set({ currentUser: user });
        useInitializationStore.getState().setStage(user ? 'project' : 'auth');
      },

      createProject: async (metadata) => {
        console.log('Creating new project:', metadata);
        const currentUser = get().currentUser;
        if (!currentUser) {
          throw new Error('No user logged in');
        }

        const projectId = generateId();
        const timestamp = new Date().toISOString();

        const newProject: SavedProject = {
          id: projectId,
          metadata: {
            id: projectId,
            name: metadata.name || 'Untitled Project',
            created: timestamp,
            updated: timestamp,
            owner: currentUser.id,
            collaborators: [],
            tags: [],
            namespace: metadata.namespace || projectId,
            version: 1,
            ...metadata
          },
          state: {
            messages: [],
            activePlan: null,
            documents: {
              types: {}
            },
            codeBlocks: [],
            annotations: []
          },
          config: {
            apiKeys: {
              anthropic: '',
              openai: '',
              pinecone: '',
              voyage: ''  
            },
            vectorDBConfig: {
              cloud: 'aws',
              region: 'us-east-1',
              indexName: ''
            },
            autoSave: true,
            collaborators: [{
              id: currentUser.id,
              role: 'owner'
            }]
          },
          history: {
            versions: [],
            current: -1
          }
        };

        ensureValidProject(newProject);
        
        set(state => ({
          projects: {
            ...state.projects,
            [projectId]: newProject
          }
        }));

        // Store active project
        localStorage.setItem('simplifide-active-project', JSON.stringify({
          id: projectId,
          lastAccessed: timestamp
        }));

        await get().setActiveProject(projectId);
        useInitializationStore.getState().setStage('config');
        return projectId;
      },

      loadProject: async (projectId) => {
        console.log('Loading project:', projectId);
        const store = get();
        const initStore = useInitializationStore.getState();
        
        try {
          const project = store.projects[projectId];
          if (!project) {
            throw new Error('Project not found');
          }

          const currentUser = store.currentUser;
          if (!currentUser) {
            throw new Error('No user logged in');
          }
          
          const userAccess = project.config.collaborators.find(c => c.id === currentUser.id);
          if (!userAccess) {
            throw new Error('Access denied');
          }

          store.cleanupAutoSave();

          set({ 
            activeProject: projectId,
            pendingChanges: false,
            lastSaved: new Date().toISOString()
          });

          // Store active project
          localStorage.setItem('simplifide-active-project', JSON.stringify({
            id: projectId,
            lastAccessed: new Date().toISOString()
          }));

          const chatStore = useChatStore.getState();
          
          if (project.config) {
            // First set the API keys and vector DB config
            await chatStore.setAPIKeys(project.config.apiKeys);
            await chatStore.setVectorDBConfig(project.config.vectorDBConfig);

            // Only move to next stages if config is valid
            if (project.config.apiKeys.pinecone && 
                project.config.apiKeys.voyage && 
                project.config.vectorDBConfig.indexName) {
              
              // Now safe to advance to config stage
              initStore.setStage('config');

              // Set up namespace
              await chatStore.setCurrentNamespace(project.metadata.namespace);
              initStore.setStage('documents');

              // Load project state
              await chatStore.loadProjectState(project);
              
              // Enable auto-save if configured
              if (store.autoSaveEnabled) {
                store.initializeAutoSave();
              }

              // Complete initialization
              initStore.setStage('chat');
              initStore.setStage('plans');
              initStore.setStage('complete');
            } else {
              console.warn('Project configuration incomplete:', projectId);
            }
          }

        } catch (error) {
          console.error('Error loading project:', error);
          initStore.setError('Failed to load project');
          throw error;
        }
      },

      saveProject: async (projectId, state) => {
        const store = get();
        const project = store.projects[projectId];
        if (!project) {
          throw new Error('Project not found');
        }

        const currentUser = store.currentUser;
        if (!currentUser) {
          throw new Error('No user logged in');
        }

        const timestamp = new Date().toISOString();
        const newVersion = project.metadata.version + 1;

        const historyCopy: SaveStateHistory = {
          projectId,
          versions: [...project.history.versions],
          current: project.history.versions.length
        };

        historyCopy.versions.push({
          version: newVersion,
          timestamp,
          author: currentUser.id,
          changes: 'Project state updated',
          state: { ...project.state, ...state }
        });

        while (historyCopy.versions.length > DEFAULT_AUTO_SAVE_CONFIG.maxVersions) {
          historyCopy.versions.shift();
        }

        const updatedProject = {
          ...project,
          metadata: {
            ...project.metadata,
            version: newVersion,
            updated: timestamp
          },
          state: { ...project.state, ...state },
          history: historyCopy
        };

        ensureValidProject(updatedProject);

        set(state => ({
          projects: {
            ...state.projects,
            [projectId]: updatedProject
          },
          pendingChanges: false,
          lastSaved: timestamp
        }));

        window.dispatchEvent(new CustomEvent('projectSaved', {
          detail: { projectId, timestamp }
        }));
      },

      updateProjectMetadata: async (projectId, metadata) => {
        const currentUser = get().currentUser;
        if (!currentUser) {
          throw new Error('No user logged in');
        }

        const timestamp = new Date().toISOString();

        set(state => {
          const project = state.projects[projectId];
          if (!project) {
            throw new Error('Project not found');
          }

          const updatedProject = {
            ...project,
            metadata: {
              ...project.metadata,
              ...metadata,
              updated: timestamp
            }
          };

          ensureValidProject(updatedProject);

          return {
            projects: {
              ...state.projects,
              [projectId]: updatedProject
            },
            pendingChanges: true
          };
        });

        if (get().autoSaveEnabled && get().pendingChanges) {
          await get().saveProject(projectId, {});
        }
      },

      deleteProject: async (projectId) => {
        const currentUser = get().currentUser;
        if (!currentUser) {
          throw new Error('No user logged in');
        }

        const project = get().projects[projectId];
        if (!project) {
          throw new Error('Project not found');
        }

        if (project.metadata.owner !== currentUser.id) {
          throw new Error('Permission denied');
        }
        
        if (get().activeProject === projectId) {
          get().cleanupAutoSave();
          localStorage.removeItem('simplifide-active-project');
        }

        set(state => {
          const { [projectId]: removed, ...remainingProjects } = state.projects;
          return {
            projects: remainingProjects,
            activeProject: state.activeProject === projectId ? null : state.activeProject
          };
        });

        window.dispatchEvent(new CustomEvent('projectDeleted', {
          detail: { projectId }
        }));
      },

      setActiveProject: (projectId) => {
        if (projectId === get().activeProject) return;
        
        get().cleanupAutoSave();
        set({ activeProject: projectId });
        
        if (projectId) {
          localStorage.setItem('simplifide-active-project', JSON.stringify({
            id: projectId,
            lastAccessed: new Date().toISOString()
          }));
          
          if (get().autoSaveEnabled) {
            get().initializeAutoSave();
          }
        } else {
          localStorage.removeItem('simplifide-active-project');
        }
      },

      setPendingChanges: (hasPendingChanges) => {
        set({ pendingChanges: hasPendingChanges });
      },

      toggleAutoSave: (enabled = !get().autoSaveEnabled) => {
        set({ autoSaveEnabled: enabled });
        get().cleanupAutoSave();

        if (enabled && get().activeProject) {
          get().initializeAutoSave();
        }
      },

      exportProject: async (projectId) => {
        const project = get().projects[projectId];
        if (!project) {
          throw new Error('Project not found');
        }

        const exportData = {
          version: 1,
          timestamp: new Date().toISOString(),
          project
        };

        return new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });
      },

      importProject: async (file) => {
        const currentUser = get().currentUser;
        if (!currentUser) {
          throw new Error('No user logged in');
        }

        try {
          const content = await file.text();
          const importData = JSON.parse(content);

          if (!importData.project?.metadata) {
            throw new Error('Invalid project file format');
          }

          const timestamp = new Date().toISOString();
          const projectId = generateId();

          const importedProject: SavedProject = {
            ...importData.project,
            id: projectId,
            metadata: {
              ...importData.project.metadata,
              id: projectId,
              owner: currentUser.id,
              created: timestamp,
              updated: timestamp,
              version: 1
            },
            config: {
              ...importData.project.config,
              collaborators: [{
                id: currentUser.id,
                role: 'owner'
              }]
            }
          };

          ensureValidProject(importedProject);

          set(state => ({
            projects: {
              ...state.projects,
              [projectId]: importedProject
            }
          }));

          return projectId;

        } catch (error) {
          console.error('Error importing project:', error);
          throw new Error('Failed to import project: Invalid file format');
        }
      },

      initializeAutoSave: () => {
        const store = get();
        if (!store.autoSaveEnabled || !store.activeProject) return;

        console.log('Initializing auto-save for project:', store.activeProject);
        const interval = setInterval(async () => {
          const currentStore = get();
          if (currentStore.pendingChanges && currentStore.activeProject) {
            try {
              await currentStore.saveProject(currentStore.activeProject, {});
              console.log('Auto-save complete');
            } catch (error) {
              console.error('Auto-save failed:', error);
            }
          }
        }, DEFAULT_AUTO_SAVE_CONFIG.interval);

        set({ autoSaveInterval: interval });
      },

      cleanupAutoSave: () => {
        const interval = get().autoSaveInterval;
        if (interval) {
          console.log('Cleaning up auto-save interval');
          clearInterval(interval);
          set({ autoSaveInterval: null });
        }
      }

    }),
    {
      name: 'simplifide-save-state',
      partialize: (state) => ({
        projects: state.projects,
        currentUser: state.currentUser,
        autoSaveEnabled: state.autoSaveEnabled
      })
    }
  )
);