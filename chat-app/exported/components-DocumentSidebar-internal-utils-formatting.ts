// components/DocumentSidebar/internal/utils/formatting.ts
export function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatRelativePath(path: string): { directory: string; fileName: string } {
  const parts = path.split('/');
  const fileName = parts.pop() || '';
  const directory = parts.join('/');
  return { directory, fileName };
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}