import { type ColumnDef } from '@/shared/tanstack';
import { EntityTableActions } from '@/shared/admin';
import { Badge } from '@/shared/ui/badge';
import type { MapTemplate } from '../model/types';
import Image from 'next/image';
import { format } from 'date-fns';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';


/**
 * Компонент для отображения сортируемого заголовка колонки
 */
const SortableHeader = ({ column, children }: { column: any, children: React.ReactNode }) => {
  const canSort = column.getCanSort();
  if (!canSort) return <span>{children}</span>;

  const sorted = column.getIsSorted();
  const handleSort = () => column.toggleSorting();

  return (
    <button
      className="flex items-center gap-2 hover:text-foreground transition-colors font-medium"
      onClick={handleSort}
    >
      {children}
      {sorted === 'asc' ? (
        <ArrowUp className="h-4 w-4" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-4 w-4" />
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-60" />
      )}
    </button>
  );
};

/**
 * @description Создает конфигурацию колонок для TanStack Table.
 * Использует table.meta для передачи функций действий из родительского компонента.
 */
export const createMapTemplatesColumns = (startIndex: number = 0): ColumnDef<MapTemplate>[] => [
  {
    id: 'index',
    header: '#',
    size: 60,
    enableResizing: false,
    enableSorting: false,
    cell: ({ row }) => {
      // ✅ ИСПРАВЛЕНО: Используем row.index для правильной нумерации в текущем порядке (учитывает сортировку)
      return (
        <span className="text-sm text-muted-foreground font-mono">
          {row.index + 1}
        </span>
      );
    },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Название</SortableHeader>,
    sortingFn: 'text',
    minSize: 150,
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="font-medium">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'imageUrls.icon',
    header: '',
    size: 80,
    minSize: 80,
    maxSize: 80,
    enableResizing: false,
    enableSorting: false,
    cell: ({ getValue, row }) => {
      const iconUrl = getValue() as string;
      return iconUrl ? (
        <div className="flex justify-center">
          <Image
            src={iconUrl}
            alt={row.original.name}
            width={56}
            height={32}
            className="h-8 w-14 object-cover rounded border border-border"
          />
        </div>
      ) : (
        <div className="flex justify-center">
          <div className="h-8 w-14 bg-muted rounded border border-border" />
        </div>
      );
    },
  },
  {
    accessorKey: 'isArchived',
    header: ({ column }) => <SortableHeader column={column}>Статус</SortableHeader>,
    size: 110,
    minSize: 110,
    maxSize: 130,
    enableResizing: false,
    sortingFn: 'basic',
    cell: ({ getValue }) => {
      const isArchived = getValue() as boolean;
      return (
        <Badge variant={isArchived ? 'archived' : 'success'}>
          {isArchived ? 'Архив' : 'Активен'}
        </Badge>
      );
    },
  },

  {
    accessorKey: 'createdAt',
    header: ({ column }) => <SortableHeader column={column}>Создан</SortableHeader>,
    size: 120,
    enableResizing: false,
    enableSorting: true,
    sortingFn: 'datetime',
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">
        {format(new Date(getValue() as string), 'dd.MM.yyyy')}
      </span>
    ),
  },
  {
    id: 'actions',
    header: 'Действия',
    size: 120,
    enableResizing: false,
    enableSorting: false,
    cell: ({ row, table }) => {
      // ✅ Получаем функции действий из table.meta
      const { onEditAction, onArchiveAction, onRestoreAction } = table.options.meta as {
        onEditAction: (template: MapTemplate) => void;
        onArchiveAction: (template: MapTemplate) => Promise<void>;
        onRestoreAction: (template: MapTemplate) => Promise<void>;
      };
      
      return (
        <EntityTableActions
          entity={row.original}
          entityType="шаблон карты"
          onEdit={() => onEditAction(row.original)}
          onArchive={() => onArchiveAction(row.original)}
          onRestore={() => onRestoreAction(row.original)}
        />
      );
    },
  },
]; 