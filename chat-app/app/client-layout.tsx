// app/client-layout.tsx
'use client';

import { useEffect } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster";
import { MainHeader } from '@/components/MainHeader';
import { LoadingScreen } from '@/components/LoadingScreen';
import { UserInit } from '@/components/UserInit';
import { ProjectSelection } from '@/components/ProjectSelection';
import { useInitializationStore } from '@/store/initialization-store';
import { useSaveStateStore } from '@/store/save-state-store';
import { useToast } from '@/hooks/use-toast';
import { initializeApplication } from '@/services/initialization-service';

interface ClientLayoutProps {
 children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
 const { stage, error, startInitialization, setError } = useInitializationStore();
 const { currentUser, activeProject } = useSaveStateStore();
 const { toast } = useToast();

 useEffect(() => {
   const handleInitError = ({ detail }: CustomEvent) => {
     const { stage, error } = detail;
     toast({
       title: `Initialization Error (${stage})`,
       description: error.message,
       variant: 'destructive'
     });
     setError(error.message);
   };

   const handleInitProgress = ({ detail }: CustomEvent) => {
     const { progress } = detail;
   };

   window.addEventListener('initStageError', handleInitError as EventListener);
   window.addEventListener('initProgress', handleInitProgress as EventListener);

   return () => {
     window.removeEventListener('initStageError', handleInitError as EventListener);
     window.removeEventListener('initProgress', handleInitProgress as EventListener);
   };
 }, [toast, setError]);

 useEffect(() => {
   if (stage === 'none') {
     console.log('Starting initialization flow...');
     initializeApplication().catch(error => {
       console.error('Failed to initialize:', error);
       setError(error instanceof Error ? error.message : 'Initialization failed');
     });
   }
 }, [stage, setError]);

 useEffect(() => {
   const cleanup = () => {
     if (currentUser) {
       localStorage.setItem('simplifide-current-user', JSON.stringify(currentUser));
     }
     if (activeProject) {
       localStorage.setItem('simplifide-active-project', JSON.stringify({
         id: activeProject,
         lastAccessed: new Date().toISOString()
       }));
     }
   };

   window.addEventListener('beforeunload', cleanup);
   return () => window.removeEventListener('beforeunload', cleanup);
 }, [currentUser, activeProject]);

 if (stage === 'none') {
   return <LoadingScreen message="Starting initialization..." fullScreen />;
 }

 if (error) {
   return (
     <div className="h-full flex items-center justify-center text-destructive">
       <div className="text-center">
         <h2 className="text-lg font-semibold mb-2">Initialization Error</h2>
         <p>{error}</p>
         <button
           onClick={() => window.location.reload()}
           className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
         >
           Retry
         </button>
       </div>
     </div>
   );
 }

 if (stage === 'auth' || !currentUser) {
   return <UserInit />;
 }

 if (stage === 'project' || !activeProject) {
   return <ProjectSelection />;
 }

 if (stage !== 'complete') {
   return <LoadingScreen message={`Initializing (${stage})...`} fullScreen />;
 }

 return (
   <ThemeProvider 
     attribute="class" 
     defaultTheme="dark" 
     enableSystem 
     disableTransitionOnChange
   >
     <div className="h-full flex flex-col bg-background text-foreground">
       <MainHeader />
       <main className="flex-1 min-h-0">
         {children}
       </main>
     </div>
     <Toaster />
   </ThemeProvider>
 );
}

export default ClientLayout;