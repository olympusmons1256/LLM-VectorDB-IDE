// components/index.ts
export { ProjectMenu } from './ProjectMenu';
export { UserSettings } from './UserSettings';
export { SaveStateControls } from './SaveStateControls';
export { Chat } from './Chat';
export { CodeContainer } from './CodeContainer';
export { DocumentSidebar } from './DocumentSidebar';
export { PlanManager } from './PlanManager';
export { LayoutCustomizer } from './layout/LayoutCustomizer';

// Re-export UI components
export {
  Button,
  buttonVariants,
} from './ui/button';

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from './ui/dropdown-menu';

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';

export {
  Alert,
  AlertDescription,
} from './ui/alert';

export {
  Switch,
} from './ui/switch';

export {
  Label,
} from './ui/label';

export {
  Input,
} from './ui/input';

export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

export {
  Toaster,
} from './ui/toaster';