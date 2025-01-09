// src/pages/_app.tsx
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Providers
import { AuthProvider } from '@/context/AuthContext';
import { ProjectProvider } from '@/context/ProjectContext';
import { SaveStateProvider } from '@/context/SaveStateContext';

// Hooks
import { useAuth } from '@/hooks/useAuth';

// Authentication Wrapper Component
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const publicPaths = ['/', '/login'];
    const path = router.pathname;

    console.log('AuthGuard', { 
      isAuthenticated, 
      path, 
      shouldRedirectToLogin: !isAuthenticated && !publicPaths.includes(path),
      shouldRedirectToProject: isAuthenticated && publicPaths.includes(path)
    });

    // Redirect to login if not authenticated and not on a public page
    if (!isAuthenticated && !publicPaths.includes(path)) {
      router.push('/login');
    } 
    // Redirect to project if authenticated and on root/login
    else if (isAuthenticated && publicPaths.includes(path)) {
      router.push('/project');
    }
  }, [isAuthenticated, router.pathname]);

  return <>{children}</>;
};

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <AuthGuard>
        <ProjectProvider>
          <SaveStateProvider>
            <Component {...pageProps} />
          </SaveStateProvider>
        </ProjectProvider>
      </AuthGuard>
    </AuthProvider>
  );
}

export default MyApp;