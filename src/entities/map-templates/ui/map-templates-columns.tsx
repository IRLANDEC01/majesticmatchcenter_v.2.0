import { type ColumnDef } from '@/shared/tanstack';
import { EntityTableActions } from '@/shared/admin';
import type { MapTemplate } from '../model/types';
import Image from 'next/image';
import { format } from 'date-fns';

/**
 * @description Создает конфигурацию колонок для TanStack Table.
 * Использует table.meta для передачи функций действий из родительского компонента.
 */
export const createMapTemplatesColumns = (): ColumnDef<MapTemplate>[] => [
  {
    accessorKey: 'imageUrls.icon',
    header: '',
    size: 60,
    enableResizing: false,
    enableSorting: false,
    cell: ({ getValue, row }) => {
      const iconUrl = getValue() as string;
      return iconUrl ? (
        <div className="flex justify-center">
          <Image
            src={iconUrl}
            alt={row.original.name}
            width={32}
            height={32}
            className="h-8 w-8 object-cover rounded border border-border"
          />
        </div>
      ) : (
        <div className="h-8 w-8 bg-muted rounded border border-border" />
      );
    },
  },
  {
    accessorKey: 'name',
    header: 'Название',
    sortingFn: 'text',
    cell: ({ getValue }) => (
      <span className="font-medium">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Описание',
    enableSorting: false,
    cell: ({ getValue }) => {
      const description = getValue() as string;
      return description ? (
        <span className="text-muted-foreground text-sm line-clamp-2">
          {description}
        </span>
      ) : (
        <span className="text-muted-foreground italic">Без описания</span>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Создан',
    size: 120,
    enableResizing: false,
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