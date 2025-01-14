// src/pages/canvas/new.tsx
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppHeader from '@/components/AppHeader';
import { useUserStore, useCanvasList } from '@/components/AppHeader/store';

const NewCanvasPage: React.FC = () => {
  const router = useRouter();
  const { user } = useUserStore();
  const { createCanvas } = useCanvasList();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleCreateCanvas = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!user) {
      router.push('/login');
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;

    try {
      const newCanvas = {
        name,
        owner: user.id,
        activeComponents: [],
        componentState: {},
        componentSettings: {},
        collaborators: [{
          id: user.id,
          role: 'owner' as const
        }]
      };

      // Wait for the canvas to be created and get its ID
      const canvasId = await createCanvas(newCanvas);
      
      // Only redirect after we have the canvas ID
      if (canvasId) {
        await router.push(`/canvas/${canvasId}?settings=true`);
      } else {
        throw new Error('Failed to create canvas');
      }
    } catch (error) {
      console.error('Error creating canvas:', error);
      // Could add error state here to show user feedback
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Create New Canvas</h1>
          
          <form onSubmit={handleCreateCanvas} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Canvas Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter canvas name"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Canvas
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default NewCanvasPage;