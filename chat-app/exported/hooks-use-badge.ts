import { useMemo } from 'react';
import type { BadgeVariant } from '@/types/badges';

type BadgeType = 'status' | 'priority' | 'complexity';

export function useBadge(type: BadgeType, value: string | undefined) {
  return useMemo(() => {
    if (!value) {
      return { variant: 'default' as BadgeVariant, label: '' };
    }

    switch (type) {
      case 'status':
        return {
          variant: (() => {
            switch (value) {
              case 'completed': return 'success';
              case 'in_progress': return 'inProgress';
              case 'failed': return 'destructive';
              default: return 'default';
            }
          })() as BadgeVariant,
          label: value.replace('_', ' ')
        };

      case 'priority':
        return {
          variant: `${value}Priority` as BadgeVariant,
          label: value
        };

      case 'complexity':
        return {
          variant: `${value}Complexity` as BadgeVariant,
          label: value
        };

      default:
        return { 
          variant: 'default' as BadgeVariant, 
          label: value 
        };
    }
  }, [type, value]);
}