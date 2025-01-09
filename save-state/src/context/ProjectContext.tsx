// src/context/ProjectContext.tsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { localStorageUtil } from '@/lib/localStorage';
import { ProjectContextType, Project, User, ProjectMember } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';

// Create the context with a default value
export const ProjectContext = createContext<ProjectContextType>({
  projects: [],
  currentProject: null,
  selectProject: () => {},
  createProject: async () => ({ id: '', name: '', userId: '', members: [] }),
  shareProject: async () => {}
});

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const { user, getUserByEmail, signup } = useAuth();
  const router = useRouter();

  // Persistent save of projects
  const saveProjectsToLocalStorage = useCallback((projectsToSave: Project[]) => {
    if (user) {
      console.log('Saving projects to localStorage:', projectsToSave);
      localStorageUtil.setItem(`user-${user.id}-projects`, projectsToSave);
    }
  }, [user]);

  // Load projects from localStorage when user changes
  useEffect(() => {
    if (user) {
      // Try to load user's projects from localStorage
      const storedProjects = localStorageUtil.getItem<Project[]>(`user-${user.id}-projects`);
      
      console.log('Loading stored projects:', storedProjects);

      // Find projects where the user is a member (owner or shared)
      const userProjects = storedProjects ? 
        storedProjects.filter(project => 
          project.userId === user.id || 
          project.members.some(member => member.userId === user.id)
        ) : 
        [];

      if (userProjects.length > 0) {
        setProjects(userProjects);
        console.log('Loaded projects:', userProjects);
      } else {
        // If no stored projects, create initial project
        const initialProject: Project = {
          id: `proj-${Date.now()}`,
          name: 'Default Project',
          userId: user.id,
          members: [{ 
            userId: user.id, 
            email: user.email, 
            role: 'owner' 
          }]
        };
        const initialProjects = [initialProject];
        setProjects(initialProjects);
        saveProjectsToLocalStorage(initialProjects);
        console.log('Created initial project:', initialProject);
      }

      // Attempt to restore last selected project
      const lastSelectedProject = localStorageUtil.getItem<Project>(`user-${user.id}-current-project`);
      if (lastSelectedProject) {
        setCurrentProject(lastSelectedProject);
        console.log('Restored last selected project:', lastSelectedProject);
      }
    } else {
      // Clear projects when user logs out
      setProjects([]);
      setCurrentProject(null);
      console.log('Cleared projects due to logout');
    }
  }, [user, saveProjectsToLocalStorage]);

  const selectProject = useCallback((project: Project) => {
    console.log('Selecting project:', project);

    setCurrentProject(project);
    
    // Persist the currently selected project
    if (user) {
      localStorageUtil.setItem(`user-${user.id}-current-project`, project);
    }
    
    router.push(`/project/${project.id}`);
  }, [user, router]);

  const createProject = useCallback(async (name: string) => {
    if (!user) throw new Error('No user authenticated');

    // Create a new project
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name,
      userId: user.id,
      members: [{ 
        userId: user.id, 
        email: user.email, 
        role: 'owner' 
      }]
    };

    console.log('Creating new project:', newProject);

    // Update projects in state and localStorage
    const updatedProjects = [...projects, newProject];
    
    // Log the current state before updating
    console.log('Current projects:', projects);
    console.log('Updated projects:', updatedProjects);

    // Update state and save to localStorage
    setProjects(updatedProjects);
    saveProjectsToLocalStorage(updatedProjects);

    // Select the newly created project
    selectProject(newProject);

    return newProject;
  }, [projects, user, selectProject, saveProjectsToLocalStorage]);

  const shareProject = useCallback(async (projectId: string, email: string, role: ProjectMember['role'] = 'editor') => {
    if (!user) throw new Error('No user authenticated');

    // Find the project
    const projectToShare = projects.find(p => p.id === projectId);
    if (!projectToShare) throw new Error('Project not found');

    // Check if the user is the owner
    if (projectToShare.userId !== user.id) {
      throw new Error('Only project owners can share');
    }

    // Find the user to share with
    let recipientUser = getUserByEmail(email);

    // If user doesn't exist, create an invitation
    if (!recipientUser) {
      try {
        // Generate a temporary password or invitation mechanism
        const tempPassword = `invite-${Math.random().toString(36).substr(2, 9)}`;
        
        // Signup with a placeholder name
        recipientUser = await signup(email, tempPassword, email.split('@')[0]);
        
        // You might want to send an email invitation in a real app
        console.log(`Invitation created for ${email}. Temporary password: ${tempPassword}`);
      } catch (error) {
        throw new Error('Failed to create invitation');
      }
    }

    // Check if user is already a member
    const isAlreadyMember = projectToShare.members.some(m => m.email === email);
    if (isAlreadyMember) throw new Error('User is already a member of this project');

    // Add new member
    const updatedProject: Project = {
      ...projectToShare,
      members: [
        ...projectToShare.members,
        { 
          userId: recipientUser.id, 
          email, 
          role 
        }
      ]
    };

    // Update projects in state
    const updatedProjects = projects.map(p => 
      p.id === projectId ? updatedProject : p
    );

    setProjects(updatedProjects);
    saveProjectsToLocalStorage(updatedProjects);

    // Update current project if it's the shared project
    if (currentProject?.id === projectId) {
      setCurrentProject(updatedProject);
    }

    console.log('Project shared:', updatedProject);
  }, [
    projects, 
    user, 
    getUserByEmail, 
    signup, 
    saveProjectsToLocalStorage, 
    currentProject
  ]);

  const value = {
    projects,
    currentProject,
    selectProject,
    createProject,
    shareProject
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};