'use client';

import { useState } from 'react';
import { useInitializationStore } from '@/store/initialization-store';
import { useSaveStateStore } from '@/store/save-state-store';
import { FolderPlus, Star, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface ProjectListItemProps {
  project: SavedProject;
  isActive: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
}

function ProjectListItem({ project, isActive, onSelect, onToggleStar }: ProjectListItemProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 text-left border rounded-lg hover:bg-accent/50 transition-colors ${
        isActive ? 'ring-2 ring-primary' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{project.metadata.name}</h3>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date(project.metadata.updated).toLocaleDateString()}
          </p>
        </div>
        {project.metadata.starred && (
          <Star className="h-4 w-4 text-yellow-500" />
        )}
      </div>
    </button>
  );
}

export function ProjectSelection() {
  const [showNewProject, setShowNewProject] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { advanceStage, setError: setInitError } = useInitializationStore();
  const { 
    projects, 
    activeProject,
    currentUser,
    createProject,
    loadProject
  } = useSaveStateStore();

  const handleCreateProject = async () => {
    if (!name.trim() || !currentUser) return;
    setLoading(true);
    setError(null);

    try {
      // Create the project
      const projectId = await createProject({
        name: name.trim(),
        namespace: name.toLowerCase().replace(/\s+/g, '-')
      });

      // Load the project
      await loadProject(projectId);

      // Move to next initialization stage
      advanceStage();
      
    } catch (error) {
      console.error('Failed to create project:', error);
      setError(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadProject = async (projectId: string) => {
    setLoading(true);
    setError(null);

    try {
      await loadProject(projectId);
      advanceStage();
    } catch (error) {
      console.error('Failed to load project:', error);
      setError(error instanceof Error ? error.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const sortedProjects = Object.values(projects)
    .sort((a, b) => new Date(b.metadata.updated).getTime() - new Date(a.metadata.updated).getTime());

  if (!currentUser) {
    setInitError('No user logged in');
    return null;
  }

  return (
    <div className="h-full flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Select a Project</h2>
          <p className="text-muted-foreground">
            Choose an existing project or create a new one
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {sortedProjects.map(project => (
            <ProjectListItem 
              key={project.id}
              project={project}
              isActive={project.id === activeProject}
              onSelect={() => handleLoadProject(project.id)}
              onToggleStar={() => {/* TODO: Add star functionality */}}
            />
          ))}
        </div>

        <Button 
          className="w-full" 
          onClick={() => setShowNewProject(true)}
          disabled={loading}
        >
          <FolderPlus className="h-4 w-4 mr-2" />
          Create New Project
        </Button>

        <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateProject();
                  }
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowNewProject(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateProject}
                disabled={loading || !name.trim()}
              >
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}