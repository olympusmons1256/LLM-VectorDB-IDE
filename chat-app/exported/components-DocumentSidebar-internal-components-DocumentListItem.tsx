// components/DocumentSidebar/internal/components/DocumentListItem.tsx
import { DOCUMENT_ICONS } from '../constants';
import { getFileTypeInfo } from '../utils/fileTypes';
import { formatFileSize, formatTimestamp, formatRelativePath } from '../utils/formatting';
import type { IndexedDocument } from '../types';

interface DocumentListItemProps {
  document: IndexedDocument;
}

export function DocumentListItem({ document }: DocumentListItemProps) {
  const metadata = document.metadata;
  if (!metadata) return null;

  const { type, label } = getFileTypeInfo(metadata.filename);
  const Icon = DOCUMENT_ICONS[type] || DOCUMENT_ICONS.code;
  const { directory, fileName } = formatRelativePath(metadata.filename);

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
      <Icon className="h-4 w-4 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="truncate font-medium" title={metadata.filename}>
            {fileName}
          </span>
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {label}
          </span>
        </div>
        {directory && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={directory}>
            {directory}
          </div>
        )}
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          <span>{formatFileSize(metadata.size)}</span>
          <span className="mx-1">•</span>
          <span title={formatTimestamp(metadata.timestamp)}>
            {formatTimestamp(metadata.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}