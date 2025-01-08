// store/save-state-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useChatStore } from './chat-store';
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

      // User management
      setCurrentUser: (user) => {
        console.log('Setting current user:', user?.id);
        set({ currentUser: user });
      },

      // Project management
      createProject: async (metadata) => {
        console.log('Creating new project:', metadata);
        const currentUser = get().currentUser;
        if (!currentUser) throw new Error('No user logged in');

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
          history: {
            projectId,
            versions: [],
            current: 0
          },
          state: {
            metadata: {} as ProjectMetadata,
            messages: [],
            activePlan: null,
            documents: {
              types: {}
            },
            codeBlocks: [],
            annotations: []
          },
          config: {
            autoSave: DEFAULT_AUTO_SAVE_CONFIG,
            collaborators: [{
              id: currentUser.id,
              role: 'owner'
            }]
          }
        };

        console.log('Setting new project in store:', projectId);
        set(state => ({
          projects: {
            ...state.projects,
            [projectId]: newProject
          },
          activeProject: projectId,
          pendingChanges: false,
          lastSaved: timestamp
        }));

        return projectId;
      },

      loadProject: async (projectId) => {
        console.log('Loading project:', projectId);
        const project = get().projects[projectId];
        if (!project) {
          console.error('Project not found:', projectId);
          throw new Error('Project not found');
        }

        const currentUser = get().currentUser;
        if (!currentUser) {
          console.error('No user logged in');
          throw new Error('No user logged in');
        }
        
        const userAccess = project.config.collaborators.find(c => c.id === currentUser.id);
        if (!userAccess) {
          console.error('Access denied for user:', currentUser.id);
          throw new Error('Access denied');
        }

        get().cleanupAutoSave();

        console.log('Setting active project:', projectId);
        set({ 
          activeProject: projectId,
          pendingChanges: false,
          lastSaved: new Date().toISOString()
        });

        const chatStore = useChatStore.getState();
        if (project.metadata.namespace) {
          console.log('Setting chat store namespace:', project.metadata.namespace);
          await chatStore.setCurrentNamespace(project.metadata.namespace);
        }

        if (get().autoSaveEnabled) {
          get().initializeAutoSave();
        }

        console.log('Project load complete:', {
          activeProject: projectId,
          namespace: project.metadata.namespace,
          chatNamespace: useChatStore.getState().currentNamespace
        });
      },

      saveProject: async (projectId, state) => {
        console.log('Saving project:', projectId);
        const project = get().projects[projectId];
        if (!project) {
          console.error('Project not found:', projectId);
          throw new Error('Project not found');
        }

        const currentUser = get().currentUser;
        if (!currentUser) {
          console.error('No user logged in');
          throw new Error('No user logged in');
        }

        const timestamp = new Date().toISOString();
        const newVersion = project.metadata.version + 1;

        const historyCopy = { ...project.history };
        historyCopy.versions.push({
          version: newVersion,
          timestamp,
          author: currentUser.id,
          changes: 'Project state updated',
          state: { ...project.state, ...state }
        });

        while (historyCopy.versions.length > project.config.autoSave.maxVersions) {
          historyCopy.versions.shift();
        }

        historyCopy.current = historyCopy.versions.length - 1;

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

        console.log('Updating project in store:', projectId);
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
        console.log('Updating project metadata:', projectId);
        const currentUser = get().currentUser;
        if (!currentUser) {
          console.error('No user logged in');
          throw new Error('No user logged in');
        }

        const timestamp = new Date().toISOString();

        set(state => {
          const project = state.projects[projectId];
          if (!project) {
            console.error('Project not found:', projectId);
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

          console.log('Updated project metadata:', updatedProject.metadata);
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
        console.log('Deleting project:', projectId);
        const currentUser = get().currentUser;
        if (!currentUser) {
          console.error('No user logged in');
          throw new Error('No user logged in');
        }

        const project = get().projects[projectId];
        if (!project) {
          console.error('Project not found:', projectId);
          throw new Error('Project not found');
        }

        if (project.metadata.owner !== currentUser.id) {
          console.error('Permission denied for user:', currentUser.id);
          throw new Error('Permission denied');
        }

        if (get().activeProject === projectId) {
          get().cleanupAutoSave();
        }

        set(state => {
          const { [projectId]: removed, ...remainingProjects } = state.projects;
          console.log('Removed project from store:', projectId);
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
        console.log('Setting active project:', projectId);
        if (projectId === get().activeProject) return;

        get().cleanupAutoSave();
        set({ activeProject: projectId });

        if (projectId && get().autoSaveEnabled) {
          get().initializeAutoSave();
        }
      },

      setPendingChanges: (hasPendingChanges) => {
        console.log('Setting pending changes:', hasPendingChanges);
        set({ pendingChanges: hasPendingChanges });
      },

      toggleAutoSave: (enabled = !get().autoSaveEnabled) => {
        console.log('Toggling auto-save:', enabled);
        set({ autoSaveEnabled: enabled });
        get().cleanupAutoSave();

        if (enabled && get().activeProject) {
          get().initializeAutoSave();
        }
      },

      exportProject: async (projectId) => {
        console.log('Exporting project:', projectId);
        const project = get().projects[projectId];
        if (!project) {
          console.error('Project not found:', projectId);
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
        console.log('Importing project from file');
        const currentUser = get().currentUser;
        if (!currentUser) {
          console.error('No user logged in');
          throw new Error('No user logged in');
        }

        try {
          const content = await file.text();
          const importData = JSON.parse(content);

          if (!importData.project?.metadata) {
            console.error('Invalid project file format');
            throw new Error('Invalid project file format');
          }

          const projectId = generateId();
          const timestamp = new Date().toISOString();

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

          console.log('Setting imported project in store:', projectId);
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