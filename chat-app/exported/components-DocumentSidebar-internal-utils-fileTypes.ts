// components/DocumentSidebar/internal/utils/fileTypes.ts
import { FILE_TYPE_PATTERNS } from '../constants';
import type { FileTypeInfo } from '../types';

export function getFileTypeInfo(filename: string): FileTypeInfo {
  // First check defined patterns
  for (const [category, patterns] of Object.entries(FILE_TYPE_PATTERNS)) {
    for (const typeInfo of patterns) {
      if (typeInfo.pattern.test(filename)) {
        return typeInfo;
      }
    }
  }

  // Handle common file types based on extension
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    // TypeScript files
    case 'ts':
      return { type: 'code', label: 'TypeScript', pattern: /.*/ };
    case 'tsx':
      return { type: 'code', label: 'React TS', pattern: /.*/ };
    
    // JavaScript files
    case 'js':
      return { type: 'code', label: 'JavaScript', pattern: /.*/ };
    case 'jsx':
      return { type: 'code', label: 'React JS', pattern: /.*/ };
    
    // Style files
    case 'css':
      return { type: 'code', label: 'CSS', pattern: /.*/ };
    case 'scss':
      return { type: 'code', label: 'SCSS', pattern: /.*/ };
    case 'less':
      return { type: 'code', label: 'Less', pattern: /.*/ };
    
    // Config files
    case 'json':
      return { type: 'project-structure', label: 'JSON Config', pattern: /.*/ };
    case 'yaml':
    case 'yml':
      return { type: 'project-structure', label: 'YAML Config', pattern: /.*/ };
    case 'toml':
      return { type: 'project-structure', label: 'TOML Config', pattern: /.*/ };
    
    // Documentation files
    case 'md':
      return { type: 'documentation', label: 'Markdown', pattern: /.*/ };
    case 'mdx':
      return { type: 'documentation', label: 'MDX', pattern: /.*/ };
    
    // Misc code files
    case 'sql':
      return { type: 'code', label: 'SQL', pattern: /.*/ };
    case 'graphql':
    case 'gql':
      return { type: 'code', label: 'GraphQL', pattern: /.*/ };
    case 'py':
      return { type: 'code', label: 'Python', pattern: /.*/ };
    case 'rb':
      return { type: 'code', label: 'Ruby', pattern: /.*/ };
    case 'go':
      return { type: 'code', label: 'Go', pattern: /.*/ };
    case 'rs':
      return { type: 'code', label: 'Rust', pattern: /.*/ };

    // Default case
    default:
      if (ext) {
        return { type: 'code', label: ext.toUpperCase(), pattern: /.*/ };
      }
      return { type: 'code', label: 'File', pattern: /.*/ };
  }
}