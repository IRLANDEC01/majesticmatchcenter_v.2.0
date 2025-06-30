'use client';

import React, { useState, useMemo } from 'react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TooltipProvider,
  PaginationControls,
  Input,
  StatusFilter
} from "@/shared/ui";
import { 
  RefreshCw, 
  AlertCircle,
  Search,
  X
} from "lucide-react";
import { useReactTable, getCoreRowModel, getSortedRowModel, type SortingState } from '@/shared/tanstack';
import { flexRender } from '@tanstack/react-table';
import { createMapTemplatesColumns } from './map-templates-columns';
import type { MapTemplate } from '../model/types';
import { useMapTemplatesServerPagination } from '../lib/use-map-templates-server-pagination';

interface MapTemplatesTableServerProps {
  onEditAction: (template: MapTemplate) => void;
  onArchiveAction: (template: MapTemplate) => Promise<void>;
  onRestoreAction: (template: MapTemplate) => Promise<void>;
  /** Показывать архивные элементы в фильтре */
  canViewArchived?: boolean;
}

/**
 * Серверная таблица шаблонов карт с TanStack Table v8 + TanStack Query v5.
 */
export function MapTemplatesTableServer({
  onEditAction,
  onArchiveAction,
  onRestoreAction,
  canViewArchived = false,
}: MapTemplatesTableServerProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo(() => createMapTemplatesColumns(), []);

  // ✅ Серверная пагинация с URL синхронизацией
  const {
    templates,
    pagination,
    isLoading,
    error,
    isPending,
    currentPage,
    searchTerm,
    localSearchTerm, // ✅ Для input value
    status,
    updatePage,
    updateSearch, // ✅ Для input onChange (с debounce)
    updateSearchImmediate, // ✅ Для кнопки очистки
    updateStatus,
  } = useMapTemplatesServerPagination();

  // ✅ Обработчик очистки поиска
  const handleSearchClear = () => {
    updateSearchImmediate('');
  };

  // ✅ TanStack Table с manual pagination
  const table = useReactTable({
    data: templates,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: pagination?.totalPages || 1,
    state: {
      sorting,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize: pagination?.limit || 15,
      },
    },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const newState = typeof updater === 'function'
        ? updater({
            pageIndex: currentPage - 1,
            pageSize: pagination?.limit || 15,
          })
        : updater;

      updatePage(newState.pageIndex + 1);
    },
    autoResetPageIndex: false,
    meta: {
      onEditAction,
      onArchiveAction,
      onRestoreAction,
    },
  });

  if (isLoading && !templates.length) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Загрузка шаблонов карт...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <p className="text-destructive mb-4">Ошибка загрузки данных</p>
        </div>
      </div>
    );
  }

  if (!templates.length && !isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            {searchTerm.length > 0
              ? `По запросу "${searchTerm}" ничего не найдено`
              : 'Нет шаблонов карт для отображения'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* ✅ Панель поиска и фильтрации */}
        <div className="flex items-center gap-4">
          {/* Поиск */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              placeholder="Поиск шаблонов карт..."
              value={localSearchTerm}
              onChange={(e) => updateSearch(e.target.value)}
              className="pl-10 pr-10"
            />
            {localSearchTerm && (
              <button
                type="button"
                onClick={handleSearchClear}
                className="absolute inset-y-0 right-0 flex cursor-pointer items-center rounded-r-md px-3 text-muted-foreground transition-colors hover:text-primary"
                aria-label="Очистить поиск"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Фильтр статуса */}
          <StatusFilter 
            value={status} 
            onChange={updateStatus}
            canViewArchived={canViewArchived}
          />
        </div>
        <div className="relative">
          {isPending && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <TableHead 
                        key={header.id} 
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={
                              header.column.getCanSort() 
                                ? 'cursor-pointer select-none flex items-center gap-2' 
                                : ''
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() && (
                              <span className="text-xs">
                                {header.column.getIsSorted() === 'desc' ? '↓' : '↑'}
                              </span>
                            )}
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map(row => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell 
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        
        <PaginationControls 
          table={table}
          totalServerRows={pagination?.total}
          isLoading={isPending || isLoading}
          hideWhenSinglePage={true}
        />
      </div>
    </TooltipProvider>
  );
}