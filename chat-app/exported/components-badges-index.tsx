import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { 
  StatusBadgeProps,
  PriorityBadgeProps,
  ComplexityBadgeProps,
  TypeBadgeProps,
  MetadataBadgeProps,
  CountBadgeProps,
  BadgeVariant
} from '@/types/badges';

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = (() => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'inProgress';
      case 'failed': return 'destructive';
      default: return 'default';
    }
  })() as BadgeVariant;

  return (
    <Badge variant={variant} className={cn('min-w-[90px] justify-center', className)}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const variant = `${priority}Priority` as BadgeVariant;
  return (
    <Badge variant={variant} className={className}>
      {priority} priority
    </Badge>
  );
}

export function ComplexityBadge({ complexity, className }: ComplexityBadgeProps) {
  const variant = `${complexity}Complexity` as BadgeVariant;
  return (
    <Badge variant={variant} className={className}>
      {complexity} complexity
    </Badge>
  );
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  return (
    <Badge variant="outline" className={className}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </Badge>
  );
}

export function MetadataBadge({ label, className }: MetadataBadgeProps) {
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

export function CountBadge({ count, total, className }: CountBadgeProps) {
  const progress = Math.round((count / total) * 100);
  const variant = progress === 100 ? 'success' : 'inProgress';
  
  return (
    <Badge variant={variant} className={cn('min-w-[80px] justify-center', className)}>
      {count}/{total}
    </Badge>
  );
}