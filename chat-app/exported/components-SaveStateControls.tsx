// components/SaveStateControls.tsx
'use client';

import { useState } from 'react';
import { Save, UploadCloud, DownloadCloud, History, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSaveStateStore } from '@/store/save-state-store';
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function SaveStateControls() {
  const { toast } = useToast();
  const [showHistory, setShowHistory] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const { 
    activeProject,
    pendingChanges,
    lastSaved,
    saveProject,
    exportProject,
    importProject,
    currentUser
  } = useSaveStateStore();

  const handleSave = async () => {
    if (!activeProject || !currentUser) return;
    
    try {
      setSaveLoading(true);
      await saveProject(activeProject, {});
      toast({
        title: "Project Saved",
        description: "All changes have been saved successfully."
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save project changes.",
        variant: "destructive"
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleExport = async () => {
    if (!activeProject) return;

    try {
      setExportLoading(true);
      const blob = await exportProject(activeProject);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project_${activeProject}_${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Project Exported",
        description: "Project has been exported successfully."
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export project.",
        variant: "destructive"
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportLoading(true);
      const projectId = await importProject(file);
      toast({
        title: "Project Imported",
        description: "Project has been imported successfully."
      });
      return projectId;
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import project.",
        variant: "destructive"
      });
    } finally {
      setImportLoading(false);
      event.target.value = ''; // Reset input
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!activeProject || saveLoading || !pendingChanges}
              className={pendingChanges ? 'border-yellow-500 dark:border-yellow-400' : ''}
            >
              <Save className={`h-4 w-4 ${saveLoading ? 'animate-spin' : ''}`} />
              {pendingChanges ? 'Save Changes' : 'Saved'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {lastSaved 
              ? `Last saved: ${new Date(lastSaved).toLocaleString()}`
              : 'Save project changes'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!activeProject || exportLoading}
            >
              <DownloadCloud className={`h-4 w-4 ${exportLoading ? 'animate-spin' : ''}`} />
              Export
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export project</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('import-project').click()}
              disabled={importLoading}
            >
              <UploadCloud className={`h-4 w-4 ${importLoading ? 'animate-spin' : ''}`} />
              Import
              <input
                id="import-project"
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import project</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(true)}
              disabled={!activeProject}
            >
              <History className="h-4 w-4" />
              History
            </Button>
          </TooltipTrigger>
          <TooltipContent>View save history</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AlertDialog open={showHistory} onOpenChange={setShowHistory}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save History</AlertDialogTitle>
            <AlertDialogDescription>
              View and restore previous versions of your project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Add history view component here */}
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}