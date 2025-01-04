// components/DocumentSidebar/internal/utils/fileTypes.ts
import { FILE_TYPE_PATTERNS } from '../constants';
import type { FileTypeInfo } from '../types';

export function getFileTypeInfo(filename: string): FileTypeInfo {
  for (const [category, patterns] of Object.entries(FILE_TYPE_PATTERNS)) {
    for (const typeInfo of patterns) {
      if (typeInfo.pattern.test(filename)) {
        return typeInfo;
      }
    }
  }
  return { type: 'code', label: 'Other Code', pattern: /.*/ };
}