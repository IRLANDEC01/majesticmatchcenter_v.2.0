// Базовые UI компоненты
export { Button } from './button';
export { Input } from './input';
export { Label } from './label';
export { Textarea } from './textarea';
export { Badge } from './badge';
export { SubmitButton } from './submit-button';
export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
export { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from './dialog';
export { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';
export { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';
export { ToggleGroup, ToggleGroupItem } from './toggle-group';

// Сложные компоненты
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from './command';
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form';

// Переиспользуемые компоненты
export { EntitySearch } from './entity-search';
export { StatusFilter } from './status-filter';
export { ErrorBoundary } from './error-boundary';
export { PaginationControls } from './pagination-controls';

// 🎯 Универсальная виртуализация доступна через хук: useMaybeVirtualizer из '@/shared/hooks'

// Layout компоненты
export { default as GlobalHeader } from './layout/global-header';
export { default as AdminSidebar } from './layout/admin-sidebar';
export { AspectRatio } from './aspect-ratio';

// Новый экспорт
export { Toaster } from './sonner';
export { FileDropzone } from './file-dropzone'; 