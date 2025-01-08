// components/MainHeader.tsx
'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { 
  Menu,
  Settings,
  FolderPlus,
  Search,
  Star,
  Clock,
  Trash2,
  FolderOpen,
  Save,
  UploadCloud,
  DownloadCloud,
  User,
  LogOut,
  Sun,
  Moon,
  Monitor,
  ThumbsUp,
  ThumbsDown,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useSaveStateStore } from '@/store/save-state-store';
import { useChatStore } from '@/store/chat-store';
import { useToast } from '@/hooks/use-toast';
import type { SavedProject } from '@/types/save-state';
import type { LayoutMode } from '@/components/layout/types';

interface ProjectItemProps {
  project: SavedProject;
  isActive: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
  onShowSettings: () => void;
  onDelete: () => void;
}

function ProjectItem({ project, isActive, onSelect, onToggleStar, onShowSettings, onDelete }: ProjectItemProps) {
  return (
    <div 
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg cursor-pointer",
        isActive ? "bg-accent" : "hover:bg-accent/50"
      )}
      onClick={onSelect}
    >
      <FolderOpen className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 truncate">{project.metadata.name}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
          className={cn(
            "p-1 rounded hover:bg-accent/50",
            project.metadata.starred ? "text-yellow-500" : ""
          )}
        >
          <Star className="h-3 w-3" />
        </button>
        {isActive && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowSettings();
              }}
              className="p-1 rounded hover:bg-accent/50"
            >
              <Settings className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded hover:bg-accent/50 text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function MainHeader() {
  const [showNewProject, setShowNewProject] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const { 
    projects,
    activeProject,
    currentUser,
    pendingChanges,
    autoSaveEnabled,
    createProject,
    loadProject,
    saveProject,
    exportProject,
    importProject,
    updateProjectMetadata,
    deleteProject,
    setCurrentUser,
    toggleAutoSave
  } = useSaveStateStore();

  const {
    layoutMode,
    setLayoutMode,
    showSettings,
    setShowSettings,
  } = useChatStore();

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
      toast({ 
        title: 'Project Created', 
        description: newProjectName 
      });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to create project', 
        variant: 'destructive' 
      });
    }
  };

  const handleLoadProject = async (projectId: string) => {
    try {
      await loadProject(projectId);
      toast({
        title: 'Project Loaded',
        description: projects[projectId]?.metadata.name
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load project',
        variant: 'destructive'
      });
    }
  };

  const handleToggleStar = async (projectId: string) => {
    const project = projects[projectId];
    if (!project) return;
    try {
      await updateProjectMetadata(projectId, {
        ...project.metadata,
        starred: !project.metadata.starred
      });
      toast({
        title: project.metadata.starred ? 'Project Unstarred' : 'Project Starred',
        description: project.metadata.name
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update project',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const project = projects[projectId];
    if (!confirm(`Are you sure you want to delete "${project.metadata.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteProject(projectId);
      toast({
        title: 'Project Deleted',
        description: project.metadata.name
      });
    } catch (error) {
      toast({
        title: 'Failed to delete project',
        description: 'An error occurred while deleting the project',
        variant: 'destructive'
      });
    }
  };

  const handleExport = async () => {
    if (!activeProject) return;
    setIsExporting(true);
    try {
      const blob = await exportProject(activeProject);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project_${activeProject}_${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Project Exported' });
    } catch (error) {
      toast({ title: 'Export Failed', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const projectId = await importProject(file);
      toast({ title: 'Project Imported' });
      await handleLoadProject(projectId);
    } catch (error) {
      toast({ title: 'Import Failed', variant: 'destructive' });
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleLayoutChange = (mode: LayoutMode) => {
    setLayoutMode(mode);
    if (activeProject) {
      updateProjectMetadata(activeProject, {
        layoutMode: mode
      });
    }
  };

  const handleSaveState = async () => {
    if (!activeProject || !pendingChanges) return;
    try {
      await saveProject(activeProject, {});
      toast({
        title: 'Changes Saved',
        description: 'All changes have been saved successfully'
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save changes',
        variant: 'destructive'
      });
    }
  };

  const filteredProjects = Object.values(projects)
    .filter(project => 
      project.metadata.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => 
      new Date(b.metadata.updated).getTime() - new Date(a.metadata.updated).getTime()
    );

  return (
    <>
      <header className="flex-none h-12">
        <div className="flex items-center justify-between h-full px-4 border-b dark:border-gray-700 bg-background">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="font-medium">simplifIDE</span>
              {activeProject && projects[activeProject] && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-muted-foreground">
                    {projects[activeProject].metadata.name}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              Layout: {layoutMode ? layoutMode.charAt(0).toUpperCase() + layoutMode.slice(1) : 'Default'}
            </Button>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
            
            <Button variant="ghost" size="icon" onClick={() => {
              setTheme(theme === 'dark' ? 'light' : 'dark');
            }}>
              {theme === 'dark' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-0 bg-background/80 backdrop-blur-sm z-50",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        !sidebarOpen && "hidden"
      )} onClick={() => setSidebarOpen(false)} />

      <div className={cn(
        "fixed top-0 left-0 h-full w-80 bg-background border-r z-50",
        "transform transition-transform duration-200 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Project Management</h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowNewProject(true)}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Create New Project
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => document.getElementById('import-project')?.click()}
                disabled={isImporting}
              >
                <UploadCloud className={`h-4 w-4 mr-2 ${isImporting ? 'animate-spin' : ''}`} />
                Import Project
                <input
                  id="import-project"
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </Button>

              {activeProject && (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    <DownloadCloud className={`h-4 w-4 mr-2 ${isExporting ? 'animate-spin' : ''}`} />
                    Export Project
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleSaveState}
                    disabled={!pendingChanges}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>

                  <div className="flex items-center justify-between px-2 py-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Auto-save</span>
                    </div>
                    <Switch
                      checked={autoSaveEnabled}
                      onCheckedChange={toggleAutoSave}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="p-4">
              <h2 className="font-semibold mb-2">Projects</h2>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-400px)]">
                {filteredProjects.map(project => (
                  <ProjectItem
                    key={project.id}
                    project={project}
                    isActive={project.id === activeProject}
                    onSelect={() => handleLoadProject(project.id)}
                    onToggleStar={() => handleToggleStar(project.id)}
                    onShowSettings={() => setShowSettings(true)}
                    onDelete={() => handleDeleteProject(project.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="border-t p-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-4 w-4" />
              <div className="flex-1">
                <div className="font-medium">{currentUser?.name}</div>
                <div className="text-sm text-muted-foreground">{currentUser?.email}</div>
              </div>
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowUserSettings(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                User Settings
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive"
                onClick={() => setCurrentUser(null)}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Project Creation Dialog */}
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

          <div className="space-y-4">
              <h3 className="text-lg font-medium">Project Settings</h3>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Project Path</Label>
                  <p className="text-sm text-muted-foreground">
                    Display full path in project list
                  </p>
                </div>
                <Switch
                  checked={currentUser?.preferences?.showProjectPath || false}
                  onCheckedChange={(checked) => {
                    if (currentUser) {
                      setCurrentUser({
                        ...currentUser,
                        preferences: {
                          ...currentUser.preferences,
                          showProjectPath: checked
                        }
                      });
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Recent Projects</Label>
                  <p className="text-sm text-muted-foreground">
                    Display recently opened projects
                  </p>
                </div>
                <Switch
                  checked={currentUser?.preferences?.showRecentProjects || false}
                  onCheckedChange={(checked) => {
                    if (currentUser) {
                      setCurrentUser({
                        ...currentUser,
                        preferences: {
                          ...currentUser.preferences,
                          showRecentProjects: checked
                        }
                      });
                    }
                  }}
                />
              </div>
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

      {/* User Settings Dialog */}
      <Dialog open={showUserSettings} onOpenChange={setShowUserSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Settings</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Profile</h3>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={currentUser?.name || ''}
                  onChange={(e) => {
                    if (currentUser) {
                      setCurrentUser({
                        ...currentUser,
                        name: e.target.value
                      });
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={currentUser?.email || ''}
                  onChange={(e) => {
                    if (currentUser) {
                      setCurrentUser({
                        ...currentUser,
                        email: e.target.value
                      });
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Editor Preferences</h3>
              <div className="space-y-2">
                <Label>Font Size</Label>
                <select
                  value={currentUser?.preferences?.fontSize || 'medium'}
                  onChange={(e) => {
                    if (currentUser) {
                      setCurrentUser({
                        ...currentUser,
                        preferences: {
                          ...currentUser.preferences,
                          fontSize: e.target.value as 'small' | 'medium' | 'large'
                        }
                      });
                    }
                  }}
                  className="w-full p-2 rounded-lg border dark:border-gray-700 bg-background"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Layout Mode</Label>
                <select
                  value={currentUser?.preferences?.layout || 'default'}
                  onChange={(e) => {
                    if (currentUser) {
                      setCurrentUser({
                        ...currentUser,
                        preferences: {
                          ...currentUser.preferences,
                          layout: e.target.value as LayoutMode
                        }
                      });
                      handleLayoutChange(e.target.value as LayoutMode);
                    }
                  }}
                  className="w-full p-2 rounded-lg border dark:border-gray-700 bg-background"
                >
                  <option value="default">Default</option>
                  <option value="compact">Compact</option>
                  <option value="wide">Wide</option>
                  <option value="stacked">Stacked</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Auto-save Settings</h3>
              <div className="space-y-2">
                <Label>Auto-save Interval</Label>
                <select
                  value={currentUser?.preferences?.autoSaveInterval || 300000}
                  onChange={(e) => {
                    if (currentUser) {
                      setCurrentUser({
                        ...currentUser,
                        preferences: {
                          ...currentUser.preferences,
                          autoSaveInterval: parseInt(e.target.value)
                        }
                      });
                    }
                  }}
                  className="w-full p-2 rounded-lg border dark:border-gray-700 bg-background"
                >
                  <option value={60000}>1 minute</option>
                  <option value={300000}>5 minutes</option>
                  <option value={600000}>10 minutes</option>
                  <option value={1800000}>30 minutes</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-save Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save changes periodically
                  </p>
                </div>
                <Switch
                  checked={currentUser?.preferences?.autoSave || false}
                  onCheckedChange={(checked) => {
                    if (currentUser) {
                      setCurrentUser({
                        ...currentUser,
                        preferences: {
                          ...currentUser.preferences,
                          autoSave: checked
                        }
                      });
                      toggleAutoSave(checked);
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserSettings(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}