// src/pages/project/[projectId].tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useProject } from '@/hooks/useProject';
import { useSaveState } from '@/hooks/useSaveState';
import { useAuth } from '@/hooks/useAuth';
import { ProjectShare } from '@/components/project/ProjectShare';

const ProjectDetailPage: React.FC = () => {
  const router = useRouter();
  const { currentProject } = useProject();
  const { saveState, loadState } = useSaveState();
  const { user, logout } = useAuth();

  // State for sharing modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Detailed logging function
  const logDiagnosticInfo = useCallback(() => {
    console.log('Diagnostic Info:', {
      currentProject: currentProject ? {
        id: currentProject.id,
        name: currentProject.name
      } : null,
      user: user ? {
        id: user.id,
        email: user.email
      } : null,
      projectId: router.query.projectId
    });
  }, [currentProject, user, router.query.projectId]);

  // Example state that will be saved
  const [taskName, setTaskName] = useState('');
  const [tasks, setTasks] = useState<string[]>([]);

  // Determine user's project role
  const userRole = currentProject?.members.find(
    member => member.userId === user?.id
  )?.role || 'viewer';

  // Load saved tasks when component mounts or changes
  useEffect(() => {
    logDiagnosticInfo();

    // Always try to load tasks when project or user changes
    const savedTasks = loadState('tasks');
    console.log('Loaded tasks:', savedTasks);
    
    if (savedTasks) {
      setTasks(savedTasks);
    }
  }, [currentProject, user, loadState, logDiagnosticInfo]);

  const addTask = () => {
    // Extensive logging for task addition
    console.log('Adding task:', {
      taskName,
      userRole,
      currentProject: !!currentProject,
      user: !!user
    });

    // Only allow editors to add tasks
    if (userRole !== 'editor' && userRole !== 'owner') {
      console.warn('User does not have permission to add tasks');
      return;
    }

    if (!currentProject || !user) {
      console.error('No current project or user');
      return;
    }

    if (taskName.trim()) {
      const newTasks = [...tasks, taskName.trim()];
      
      // Log before saving
      console.log('Attempting to save tasks:', newTasks);
      
      setTasks(newTasks);
      
      try {
        saveState('tasks', newTasks);
        console.log('Tasks saved successfully');
      } catch (error) {
        console.error('Failed to save tasks:', error);
      }
      
      setTaskName('');
    }
  };

  // Redirect if no project is selected
  useEffect(() => {
    if (!currentProject) {
      router.push('/project');
    }
  }, [currentProject]);

  if (!currentProject) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold">{currentProject.name}</h1>
            {userRole === 'owner' && (
              <button 
                onClick={() => setIsShareModalOpen(true)}
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
              >
                Share
              </button>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>Welcome, {user?.name}</span>
            <span className="text-sm text-gray-500 capitalize">Role: {userRole}</span>
            <button 
              onClick={() => router.push('/project')}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
            >
              Switch Project
            </button>
            <button 
              onClick={logout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl mb-4">Project Tasks</h2>
          <div className="flex mb-4">
            <input 
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="Enter task name"
              disabled={userRole === 'viewer'}
              className="flex-grow px-3 py-2 border rounded-l"
            />
            <button 
              onClick={addTask}
              disabled={userRole === 'viewer'}
              className={`
                ${userRole === 'viewer' 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600'}
                text-white px-4 py-2 rounded-r
              `}
            >
              Add Task
            </button>
          </div>

          <ul className="space-y-2">
            {tasks.map((task, index) => (
              <li 
                key={index} 
                className="bg-gray-100 p-3 rounded flex justify-between items-center"
              >
                {task}
                {userRole !== 'viewer' && (
                  <button 
                    onClick={() => {
                      const newTasks = tasks.filter((_, i) => i !== index);
                      setTasks(newTasks);
                      saveState('tasks', newTasks);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Project Share Modal */}
      {isShareModalOpen && currentProject && (
        <ProjectShare 
          projectId={currentProject.id}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ProjectDetailPage;