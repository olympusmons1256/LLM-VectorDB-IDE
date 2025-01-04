import { useDocumentSidebarState } from '../state';

export function FileTypeFilter() {
  const { selectedType, setSelectedType } = useDocumentSidebarState();

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">Show</label>
      <select
        value={selectedType || ''}
        onChange={(e) => setSelectedType(e.target.value || null)}
        className="w-full p-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800"
      >
        <option value="">All Files</option>
        <option value="project-structure">Project Structure</option>
        <option value="core-architecture">Core Architecture</option>
        <option value="code">Source Code</option>
        <option value="documentation">Documentation</option>
      </select>
    </div>
  );
}