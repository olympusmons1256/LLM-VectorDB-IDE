// hooks/use-active-project.ts
import { useSaveStateStore } from '@/store/save-state-store';

export function useActiveProject() {
  const activeProject = useSaveStateStore(state => state.activeProject);
  const projects = useSaveStateStore(state => state.projects);
  const currentProject = activeProject ? projects[activeProject] : null;

  return {
    activeProject,
    currentProject,
    isActive: !!activeProject && !!currentProject
  };
}