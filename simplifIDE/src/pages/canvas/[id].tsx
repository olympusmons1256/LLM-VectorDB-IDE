// src/pages/canvas/[id].tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import dynamic from 'next/dynamic';
import { Canvas } from '@/types/canvas';
import { validateCanvas } from '@/utils/validation';
import { useUserStore } from '@/components/AppHeader/store';
import AppHeader from '@/components/AppHeader';
import { CanvasSettingsModal } from '@/components/Settings/CanvasSettingsModal';

// Dynamically import CanvasView with no SSR to avoid hydration issues
const CanvasView = dynamic(
  () => import('@/components/CanvasView'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }
);

interface CanvasPageProps {
  initialCanvas: Canvas | null;
  error?: string;
}

export const getServerSideProps: GetServerSideProps<CanvasPageProps> = async (context) => {
  const { id } = context.query;

  if (!id || typeof id !== 'string') {
    return {
      redirect: {
        destination: '/canvas',
        permanent: false,
      },
    };
  }

  return {
    props: {
      initialCanvas: null,
    },
  };
};

const CanvasPage: React.FC<CanvasPageProps> = ({ initialCanvas, error: serverError }) => {
  const router = useRouter();
  const { id, settings } = router.query;
  const { user } = useUserStore();
  const [showSettings, setShowSettings] = useState(Boolean(settings));

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => {
    setShowSettings(Boolean(settings));
  }, [settings]);

  if (!user) {
    return null;
  }

  if (serverError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-800">Error</h2>
            <p className="text-red-600 mt-2">{serverError}</p>
            <button
              onClick={() => router.push('/canvas')}
              className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
            >
              Return to Canvas List
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (typeof id !== 'string') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        <CanvasSettingsModal
          isOpen={showSettings}
          onClose={() => {
            setShowSettings(false);
            const { pathname, query } = router;
            const { settings: _, ...restQuery } = query;
            router.replace({ pathname, query: restQuery }, undefined, { shallow: true });
          }}
          canvasId={id}
        />
        <CanvasView canvasId={id} />
      </main>
    </div>
  );
};

export default CanvasPage;