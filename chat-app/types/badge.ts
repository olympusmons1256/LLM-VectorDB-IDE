// types/badge.ts
import { VariantProps } from 'class-variance-authority';
import { badgeVariants } from '@/components/ui/badge';

export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  className?: string;
}

export type PriorityType = 'high' | 'medium' | 'low';
export type ComplexityType = 'high' | 'medium' | 'low';
export type StatusType = 'pending' | 'in_progress' | 'completed' | 'failed';

// utils/badge-helpers.ts
export function formatBadgeLabel(value: string): string {
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getBadgeVariant(type: 'priority' | 'complexity' | 'status', value: string): BadgeVariant {
  switch (type) {
    case 'priority':
      return `${value}Priority` as BadgeVariant;
    case 'complexity':
      return `${value}Complexity` as BadgeVariant;
    case 'status':
      return value as BadgeVariant;
    default:
      return 'default';
  }
}

// hooks/use-badge.ts
import { useMemo } from 'react';
import { BadgeVariant } from '@/types/badge';

export function useBadge(type: 'priority' | 'complexity' | 'status', value: string | undefined) {
  return useMemo(() => {
    if (!value) return { variant: 'default' as BadgeVariant, label: '' };

    const variant = getBadgeVariant(type, value);
    const label = formatBadgeLabel(value);

    return { variant, label };
  }, [type, value]);
}

// Example usage in a component:
import { Badge } from '@/components/ui/badge';
import { useBadge } from '@/hooks/use-badge';

function StepStatus({ status }: { status: string }) {
  const { variant, label } = useBadge('status', status);
  
  return (
    <Badge variant={variant} className="w-24 justify-center">
      {label}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const { variant, label } = useBadge('priority', priority);
  
  return (
    <Badge variant={variant}>
      {label} priority
    </Badge>
  );
}

function ComplexityBadge({ complexity }: { complexity: string }) {
  const { variant, label } = useBadge('complexity', complexity);
  
  return (
    <Badge variant={variant}>
      {label} complexity
    </Badge>
  );
}