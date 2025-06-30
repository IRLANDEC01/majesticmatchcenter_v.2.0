'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { 
  TooltipProvider,
} from "@/shared/ui/tooltip";
import { 
  RefreshCw, 
  AlertCircle,
} from "lucide-react";
import { useReactTable, getCoreRowModel, getSortedRowModel, type SortingState } from '@/shared/tanstack';
import { flexRender } from '@tanstack/react-table';
import { useMapTemplatesVirtualizer } from '@/shared/hooks/use-maybe-virtualizer';
import { createMapTemplatesColumns } from './map-templates-columns';
import type { MapTemplate } from '../model/types';

interface MapTemplatesTableProps {
  templates: MapTemplate[];
  isLoading: boolean;
  error: any;
  onEditAction: (template: MapTemplate) => void;
  searchTerm: string;
  onArchiveAction: (template: MapTemplate) => Promise<void>;
  onRestoreAction: (template: MapTemplate) => Promise<void>;
  // ✅ Новые props для infinite scroll
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  loadMore?: () => void;
  totalCount?: number;
}

/**
 * Таблица шаблонов карт на TanStack Table v8.
 * Поддерживает сортировку, редактирование, архивацию и восстановление.
 */
export function MapTemplatesTable({
  templates,
  isLoading,
  error,
  onEditAction,
  searchTerm,
  onArchiveAction,
  onRestoreAction,
  hasNextPage = false,
  isFetchingNextPage = false,
  loadMore,
  totalCount,
}: MapTemplatesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo(() => createMapTemplatesColumns(), []);
  
  // ✅ Умная виртуализация - включается при >100 записей
  const { enableVirtual, virtualizer, debugInfo, containerRef } = useMapTemplatesVirtualizer(templates);

  // ✅ Intersection Observer для автозагрузки при infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ✅ Колбэк для автозагрузки следующей страницы
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && loadMore) {
      loadMore();
    }
  }, [hasNextPage, isFetchingNextPage, loadMore]);

  // ✅ Настройка Intersection Observer для автозагрузки
  useEffect(() => {
    if (!sentinelRef.current || !enableVirtual || !loadMore) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
          handleLoadMore();
        }
      },
      {
        rootMargin: '100px', // Загружаем заранее за 100px до конца
        threshold: 0.1,
      }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enableVirtual, handleLoadMore, loadMore]);

  // ✅ Дополнительная проверка на виртуализации при скролле
  useEffect(() => {
    if (!enableVirtual || !virtualizer || !loadMore) {
      return;
    }

    const virtualItems = virtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;

    // Проверяем если видимая последняя строка близко к концу данных
    const lastVisibleIndex = virtualItems[virtualItems.length - 1].index;
    const shouldLoadMore = lastVisibleIndex >= templates.length - 10;

    if (shouldLoadMore && hasNextPage && !isFetchingNextPage) {
      handleLoadMore();
    }
  }, [enableVirtual, virtualizer, templates.length, hasNextPage, isFetchingNextPage, handleLoadMore, loadMore]);

  // ✅ TanStack Table без клиентской пагинации (готов к серверной)
  const table = useReactTable({
    data: templates,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { 
      sorting,
    },
    onSortingChange: setSorting,
    autoResetPageIndex: false, // ✅ Важно для будущей серверной пагинации
    // ✅ Передаем функции действий через meta для доступа в колонках
    meta: {
      onEditAction,
      onArchiveAction,
      onRestoreAction,
    },
  });

  // Состояние загрузки
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Загрузка шаблонов карт...</p>
      </div>
    );
  }

  // Состояние ошибки
  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
        <p className="text-destructive mb-4">Ошибка загрузки данных</p>
      </div>
    );
  }

  // Пустое состояние
  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          {searchTerm.length > 0 
            ? `По запросу "${searchTerm}" ничего не найдено`
            : 'Нет шаблонов карт для отображения'
          }
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* ✅ Информация о загруженных данных (только для infinite scroll) */}
        {loadMore && totalCount && (
          <div className="text-sm text-muted-foreground">
            Показано {templates.length} из {totalCount} записей
            {process.env.NODE_ENV === 'development' && (
              <span className="ml-2">• {debugInfo}</span>
            )}
          </div>
        )}

        <div className="rounded-md border">
          {/* Debug информация для разработки (если нет infinite scroll) */}
          {process.env.NODE_ENV === 'development' && !loadMore && (
            <div className="text-xs text-muted-foreground p-2 border-b bg-muted/50">
              🔧 {debugInfo}
            </div>
          )}
        
        {enableVirtual ? (
          // ✅ Виртуализированная таблица для больших данных
          <div 
            ref={containerRef as React.RefObject<HTMLDivElement>}
            className="h-[600px] overflow-auto"
          >
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
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
              <TableBody 
                style={{ height: `${virtualizer?.getTotalSize()}px` }}
                className="relative"
              >
                {virtualizer?.getVirtualItems().map(virtualRow => {
                  const row = table.getRowModel().rows[virtualRow.index];
                  return (
                    <TableRow 
                      key={row.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell 
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          // ✅ Стандартная таблица для небольших данных
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
        )}
        </div>

        {/* ✅ Sentinel для автозагрузки при infinite scroll */}
        {loadMore && hasNextPage && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Загрузка...</span>
          </div>
        )}

        {/* ✅ Индикатор загрузки следующей страницы */}
        {loadMore && isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Загружается следующая страница...</span>
          </div>
        )}

        {/* ✅ Индикатор окончания данных */}
        {loadMore && !hasNextPage && templates.length > 0 && (
          <div className="text-center py-4">
            <span className="text-sm text-muted-foreground">Все данные загружены</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
} 