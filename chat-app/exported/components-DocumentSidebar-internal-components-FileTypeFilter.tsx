// components/DocumentSidebar/internal/components/FileTypeFilter.tsx
import { useState, useEffect } from 'react';
import { useDocumentSidebarState } from '../state';
import { useSaveStateStore } from '@/store/save-state-store';

export function FileTypeFilter() {
  const { 
    selectedType, 
    setSelectedType, 
    documents, 
    currentNamespace 
  } = useDocumentSidebarState();
  
  const { activeProject, projects } = useSaveStateStore();
  const docs = documents[currentNamespace] || [];

  // Debug first document structure
  if (docs.length > 0) {
    console.log('First document:', {
      fullDoc: docs[0],
      metadata: docs[0].metadata,
      filename: docs[0].metadata?.filename,
      text: docs[0].text?.substring(0, 100)
    });
  }

  // Debug individual document being categorized
  const getCategory = (doc: any) => {
    // Debug individual document being categorized
    console.log('Categorizing doc:', {
      filename: doc.metadata?.filename,
      text: doc.text?.substring(0, 100),
      metadata: doc.metadata
    });

    const filename = doc.metadata?.filename?.toLowerCase() || '';
    
    // More specific categorization based on filename patterns
    if (filename.includes('/app/') || filename.includes('page.')) return 'app';
    if (filename.includes('/components/')) return 'component';
    if (filename.includes('/utils/') || filename.includes('/hooks/') || filename.includes('util.') || filename.includes('hook.')) return 'util';
    if (filename.includes('/api/') || filename.includes('route.ts')) return 'api';
    if (filename.includes('/types/') || filename.includes('.types.') || filename.includes('.d.ts')) return 'type';
    if (filename.includes('config') || filename.endsWith('.env')) return 'config';
    if (filename.endsWith('.css') || filename.endsWith('.scss') || filename.includes('style')) return 'style';
    if (filename.endsWith('.test.') || filename.endsWith('.spec.')) return 'test';
    if (filename.endsWith('.md') || filename.includes('/docs/')) return 'doc';
    
    // Default to 'unknown' but log it for debugging
    console.log('Uncategorized file:', filename);
    return 'unknown';
  };

  // Calculate counts by category with debugging
  const categoryCounts = docs.reduce((acc, doc) => {
    const category = getCategory(doc);
    acc[category] = (acc[category] || 0) + 1;
    acc.all = (acc.all || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('Category counts:', categoryCounts);

  const fileTypes = [
    { value: '', label: 'All Files', category: 'all' },
    { value: 'app', label: 'App Components', category: 'app' },
    { value: 'component', label: 'UI Components', category: 'component' },
    { value: 'util', label: 'Utils & Hooks', category: 'util' },
    { value: 'api', label: 'API Routes', category: 'api' },
    { value: 'type', label: 'Types & Interfaces', category: 'type' },
    { value: 'config', label: 'Config Files', category: 'config' },
    { value: 'style', label: 'Styles', category: 'style' },
    { value: 'test', label: 'Tests', category: 'test' },
    { value: 'doc', label: 'Documentation', category: 'doc' }
  ];

  const handleTypeChange = (newType: string) => {
    console.log('Changing file type filter:', newType);
    setSelectedType(newType || null);
    
    // Persist the selection in localStorage
    try {
      const savedState = localStorage.getItem('document-sidebar-state') || '{}';
      const state = JSON.parse(savedState);
      localStorage.setItem('document-sidebar-state', JSON.stringify({
        ...state,
        selectedType: newType || null
      }));
    } catch (error) {
      console.error('Error persisting file type selection:', error);
    }
  };

  // Update the auto-save state if available
  useEffect(() => {
    if (activeProject) {
      const project = projects[activeProject];
      if (project) {
        const updatedProject = {
          ...project,
          state: {
            ...project.state,
            documents: {
              ...project.state.documents,
              selectedType
            }
          },
          metadata: {
            ...project.metadata,
            updated: new Date().toISOString()
          }
        };
        // Save the updated project state
        projects[activeProject] = updatedProject;
        localStorage.setItem('simplifide-save-state', JSON.stringify({
          projects,
          currentUser: useSaveStateStore.getState().currentUser,
          autoSaveEnabled: useSaveStateStore.getState().autoSaveEnabled
        }));
      }
    }
  }, [selectedType, activeProject, projects]);

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-foreground mb-2">Show</label>
      <select
        value={selectedType || ''}
        onChange={(e) => handleTypeChange(e.target.value)}
        className="w-full p-2 rounded-lg border dark:border-gray-700 
                  bg-background text-foreground
                  focus:outline-none focus:ring-1 focus:ring-primary
                  transition-colors"
      >
        {fileTypes.map(type => {
          const count = categoryCounts[type.category || type.value] || 0;
          return (
            <option 
              key={type.value} 
              value={type.value} 
              className="bg-background text-foreground"
            >
              {type.label} ({count})
            </option>
          );
        })}
      </select>
    </div>
  );
}