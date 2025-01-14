'use client';

import { useState, useEffect } from 'react';
import { Menu, FolderPlus, Search } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useSaveStateStore } from '@/store/save-state-store';

export function ProjectMenu() {
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  const { 
    currentUser, 
    setCurrentUser, 
    projects,
    createProject,
    loadProject 
  } = useSaveStateStore();

  // Initialize a default user if none exists
  useEffect(() => {
    if (!currentUser) {
      console.log('Initializing default user');
      setCurrentUser({
        id: 'default-user',
        name: 'Default User',
        email: 'user@example.com',
        preferences: {
          theme: 'dark',
          fontSize: 'medium',
          layout: 'default',
          autoSave: true,
          autoSaveInterval: 300000,
          showProjectPath: true,
          showRecentProjects: true
        },
        lastActive: new Date().toISOString()
      });
    }
  }, [currentUser, setCurrentUser]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !currentUser) return;
    
    try {
      const projectId = await createProject({
        name: newProjectName,
        namespace: newProjectName.toLowerCase().replace(/\s+/g, '-')
      });
      await loadProject(projectId);
      setShowNewProject(false);
      setNewProjectName('');
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  console.log('ProjectMenu State:', { currentUser, projectCount: Object.keys(projects).length });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem 
            className="flex items-center gap-2 p-3 cursor-pointer hover:bg-accent"
            onClick={() => setShowNewProject(true)}
          >
            <FolderPlus className="h-5 w-5" />
            <div>
              <div className="font-medium">New Project</div>
              <div className="text-sm text-muted-foreground">
                {Object.keys(projects).length === 0 
                  ? 'Create your first project to get started'
                  : 'Create a new project'
                }
              </div>
            </div>
          </DropdownMenuItem>

          {Object.keys(projects).length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center border-t">
              No projects created yet
            </div>
          )}

          {/* We'll add the project list back once basic functionality works */}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateProject();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProject(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}