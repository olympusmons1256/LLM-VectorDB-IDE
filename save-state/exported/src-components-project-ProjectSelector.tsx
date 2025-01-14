// src/components/project/ProjectSelector.tsx
import React, { useState, useEffect } from 'react';
import { useProject } from '@/hooks/useProject';
import { useAuth } from '@/hooks/useAuth';

export const ProjectSelector: React.FC = () => {
  const { projects, selectProject, createProject } = useProject();
  const { user, logout } = useAuth();
  const [newProjectName, setNewProjectName] = useState('');

  // Add logging to see projects changing
  useEffect(() => {
    console.log('Current Projects:', projects);
  }, [projects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Attempting to create project:', {
      name: newProjectName,
      user: user
    });

    if (newProjectName.trim()) {
      try {
        await createProject(newProjectName.trim());
        console.log('Project creation submitted');
        setNewProjectName('');
      } catch (error) {
        console.error('Project creation failed:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Select a Project</h1>
          <div className="flex items-center space-x-4">
            <span>Welcome, {user?.name}</span>
            <button 
              onClick={logout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id}
              onClick={() => {
                console.log('Selecting project:', project);
                selectProject(project);
              }}
              className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold">{project.name}</h2>
              <p className="text-gray-500">Project ID: {project.id}</p>
            </div>
          ))}

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <input 
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
                className="w-full px-3 py-2 border rounded"
                required
              />
              <button 
                type="submit"
                className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
              >
                Create Project
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};