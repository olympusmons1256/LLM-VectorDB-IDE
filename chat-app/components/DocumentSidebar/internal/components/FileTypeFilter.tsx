// components/DocumentSidebar/internal/components/FileTypeFilter.tsx
import { useDocumentSidebarState } from '../state';

export function FileTypeFilter() {
  const { selectedType, setSelectedType, documents, currentNamespace } = useDocumentSidebarState();
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
    if (filename.includes('.test.') || filename.includes('.spec.')) return 'test';
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
    { value: 'app', label: 'App Components' },
    { value: 'component', label: 'UI Components' },
    { value: 'util', label: 'Utils & Hooks' },
    { value: 'api', label: 'API Routes' },
    { value: 'type', label: 'Types & Interfaces' },
    { value: 'config', label: 'Config Files' },
    { value: 'style', label: 'Styles' },
    { value: 'test', label: 'Tests' },
    { value: 'doc', label: 'Documentation' }
  ];

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">Show</label>
      <select
        value={selectedType || ''}
        onChange={(e) => setSelectedType(e.target.value || null)}
        className="w-full p-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800"
      >
        {fileTypes.map(type => {
          const count = categoryCounts[type.category || type.value] || 0;
          return (
            <option key={type.value} value={type.value}>
              {type.label} ({count})
            </option>
          );
        })}
      </select>
    </div>
  );
}