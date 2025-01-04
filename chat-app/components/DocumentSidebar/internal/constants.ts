// components/DocumentSidebar/internal/constants.ts
import { File, BookOpen, Layers, ClipboardList, FileText } from 'lucide-react';
import type { FileTypeInfo } from './types';

export const MAX_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB per chunk
export const REFRESH_INTERVAL = 30000; // 30 seconds
export const DEBOUNCE_DELAY = 1000; // 1 second
export const REFRESH_COOLDOWN = 5000; // 5 seconds

export const DOCUMENT_ICONS = {
  'project-plans': ClipboardList,
  'plan': ClipboardList,
  'instructions': BookOpen,
  'code': File,
  'documentation': FileText,
  'project-structure': File,
  'core-architecture': Layers
} as const;

export const FILE_TYPE_PATTERNS: Record<string, FileTypeInfo[]> = {
  'project-structure': [
    { type: 'project-structure', pattern: /package\.json$/, label: 'Package Config' },
    { type: 'project-structure', pattern: /tsconfig\.json$/, label: 'TypeScript Config' },
    { type: 'project-structure', pattern: /next\.config\.[jt]s$/, label: 'Next.js Config' },
    { type: 'project-structure', pattern: /tailwind\.config\.[jt]s$/, label: 'Tailwind Config' },
    { type: 'project-structure', pattern: /\.env/, label: 'Environment Config' },
    { type: 'project-structure', pattern: /README\.md$/, label: 'Project Readme' }
  ],
  'core-architecture': [
    { type: 'core-architecture', pattern: /^app\/.*\/layout\.[jt]sx?$/, label: 'App Layout' },
    { type: 'core-architecture', pattern: /^app\/.*\/page\.[jt]sx?$/, label: 'Page Component' },
    { type: 'core-architecture', pattern: /^app\/api\/.*\/route\.[jt]s$/, label: 'API Route' },
    { type: 'core-architecture', pattern: /^lib\/.*\.[jt]s$/, label: 'Library Code' },
    { type: 'core-architecture', pattern: /^services\/.*\.[jt]s$/, label: 'Service Layer' },
    { type: 'core-architecture', pattern: /^store\/.*\.[jt]s$/, label: 'State Management' }
  ],
  'code': [
    { type: 'code', pattern: /^src\/.*\.[jt]sx?$/, label: 'Source Code' },
    { type: 'code', pattern: /^components\/.*\.[jt]sx?$/, label: 'Components' },
    { type: 'code', pattern: /^hooks\/.*\.[jt]sx?$/, label: 'React Hooks' },
    { type: 'code', pattern: /^utils\/.*\.[jt]s$/, label: 'Utilities' },
    { type: 'code', pattern: /^types\/.*\.[jt]s$/, label: 'Type Definitions' }
  ],
  'documentation': [
    { type: 'documentation', pattern: /^docs\/.*\.md$/, label: 'Documentation' },
    { type: 'documentation', pattern: /\.md$/, label: 'Markdown File' }
  ]
};