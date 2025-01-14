import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary-foreground ring-primary/20 dark:bg-primary/20 dark:text-primary-foreground/90 dark:ring-primary/30",
        destructive: "bg-destructive/10 text-destructive ring-destructive/20 dark:bg-destructive/20 dark:text-destructive-foreground dark:ring-destructive/30",
        outline: "bg-background/50 ring-border dark:bg-background/50 dark:text-foreground/90 dark:ring-border/50",
        success: "bg-green-100/90 text-green-700 ring-green-500/20 dark:bg-green-500/20 dark:text-green-300 dark:ring-green-500/30",
        // Status badges
        pending: "bg-yellow-100/90 text-yellow-700 ring-yellow-500/20 dark:bg-yellow-500/20 dark:text-yellow-300 dark:ring-yellow-500/30",
        inProgress: "bg-blue-100/90 text-blue-700 ring-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 dark:ring-blue-500/30",
        completed: "bg-green-100/90 text-green-700 ring-green-500/20 dark:bg-green-500/20 dark:text-green-300 dark:ring-green-500/30",
        failed: "bg-red-100/90 text-red-700 ring-red-500/20 dark:bg-red-500/20 dark:text-red-300 dark:ring-red-500/30",
        // Priority badges
        highPriority: "bg-red-100/90 text-red-700 ring-red-500/20 dark:bg-red-500/20 dark:text-red-300 dark:ring-red-500/30",
        mediumPriority: "bg-yellow-100/90 text-yellow-700 ring-yellow-500/20 dark:bg-yellow-500/20 dark:text-yellow-300 dark:ring-yellow-500/30",
        lowPriority: "bg-green-100/90 text-green-700 ring-green-500/20 dark:bg-green-500/20 dark:text-green-300 dark:ring-green-500/30",
        // Complexity badges
        highComplexity: "bg-purple-100/90 text-purple-700 ring-purple-500/20 dark:bg-purple-500/20 dark:text-purple-300 dark:ring-purple-500/30",
        mediumComplexity: "bg-blue-100/90 text-blue-700 ring-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 dark:ring-blue-500/30",
        lowComplexity: "bg-green-100/90 text-green-700 ring-green-500/20 dark:bg-green-500/20 dark:text-green-300 dark:ring-green-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export const getPriorityBadgeVariant = (priority: string | undefined): BadgeProps["variant"] => {
  switch (priority?.toLowerCase()) {
    case "high":
      return "highPriority";
    case "medium":
      return "mediumPriority";
    case "low":
      return "lowPriority";
    default:
      return "default";
  }
};

export const getComplexityBadgeVariant = (complexity: string | undefined): BadgeProps["variant"] => {
  switch (complexity?.toLowerCase()) {
    case "high":
      return "highComplexity";
    case "medium":
      return "mediumComplexity";
    case "low":
      return "lowComplexity";
    default:
      return "default";
  }
};

export const getStatusBadgeVariant = (status: string | undefined): BadgeProps["variant"] => {
  switch (status?.toLowerCase()) {
    case "pending":
      return "pending";
    case "in_progress":
      return "inProgress";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    default:
      return "default";
  }
};

export { Badge, badgeVariants };