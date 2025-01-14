// src/pages/canvas/index.tsx
import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCanvasList, useUserStore } from '@/components/AppHeader/store';
import { Trash2 } from 'lucide-react';

const CanvasListPage: React.FC = () => {
  const router = useRouter();
  const { user } = useUserStore();
  const { canvases, loading, error, loadCanvases, deleteCanvas } = useCanvasList();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => {
    loadCanvases();
  }, [loadCanvases]);

  const handleDeleteCanvas = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent Link navigation
    if (window.confirm('Are you sure you want to delete this canvas? This action cannot be undone.')) {
      try {
        await deleteCanvas(id);
      } catch (error) {
        console.error('Failed to delete canvas:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800">Error</h2>
          <p className="text-red-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const canvasArray = Object.values(canvases);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Canvases</h1>
          <Link
            href="/canvas/new"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Create New Canvas
          </Link>
        </div>

        {canvasArray.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-gray-500 mb-4">No canvases yet</p>
            <Link
              href="/canvas/new"
              className="text-blue-500 hover:text-blue-600"
            >
              Create your first canvas
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {canvasArray.map((canvas) => (
              <Link
                key={canvas.id}
                href={`/canvas/${canvas.id}`}
                className="relative group block bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <button
                  onClick={(e) => handleDeleteCanvas(canvas.id, e)}
                  className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Delete canvas"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  {canvas.name}
                </h2>
                <div className="text-sm text-gray-500">
                  Last updated: {new Date(canvas.updated).toLocaleDateString()}
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {canvas.activeComponents.length} active components
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasListPage;