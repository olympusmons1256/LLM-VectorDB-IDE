// types/badges.ts
import type { VariantProps } from 'class-variance-authority';
import type { badgeVariants } from '@/components/ui/badge';

// Base types
export type StatusType = 'pending' | 'in_progress' | 'completed' | 'failed';
export type PriorityType = 'high' | 'medium' | 'low';
export type ComplexityType = 'high' | 'medium' | 'low';

// Badge variant types
export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

// Base props interface
interface BaseBadgeProps {
  className?: string;
}

// Component props interfaces
export interface StatusBadgeProps extends BaseBadgeProps {
  status: StatusType;
}

export interface PriorityBadgeProps extends BaseBadgeProps {
  priority: PriorityType;
}

export interface ComplexityBadgeProps extends BaseBadgeProps {
  complexity: ComplexityType;
}

export interface TypeBadgeProps extends BaseBadgeProps {
  type: string;
}

export interface MetadataBadgeProps extends BaseBadgeProps {
  label: string;
}

export interface CountBadgeProps extends BaseBadgeProps {
  count: number;
  total: number;
}

// Type guards
export function isValidStatus(status: string): status is StatusType {
  return ['pending', 'in_progress', 'completed', 'failed'].includes(status);
}

export function isValidPriority(priority: string): priority is PriorityType {
  return ['high', 'medium', 'low'].includes(priority);
}

export function isValidComplexity(complexity: string): priority is ComplexityType {
  return ['high', 'medium', 'low'].includes(complexity);
}

// Badge state types
export interface BadgeState {
  variant: BadgeVariant;
  label: string;
}