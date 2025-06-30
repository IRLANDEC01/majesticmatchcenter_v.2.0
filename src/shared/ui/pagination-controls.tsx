'use client';

import { Button } from './button';
import { type Table } from '@/shared/tanstack';

interface PaginationControlsProps {
  table: Table<any>;
  /** Общее количество записей на сервере (для серверной пагинации) */
  totalServerRows?: number;
  /** Показывать ли элементы управления если только одна страница */
  hideWhenSinglePage?: boolean;
  /** Блокировать кнопки во время загрузки */
  isLoading?: boolean;
}

/**
 * Компонент управления пагинацией для TanStack Table
 * Отображает кнопки навигации и информацию о текущей странице
 */
export function PaginationControls({ 
  table, 
  totalServerRows, 
  hideWhenSinglePage = true,
  isLoading = false 
}: PaginationControlsProps) {
  const pagination = table.getState().pagination;
  const currentPage = pagination.pageIndex + 1;
  const totalPages = table.getPageCount();
  
  // ✅ ИСПРАВЛЕНИЕ: Используем серверный total если есть, иначе клиентский
  const totalRows = totalServerRows ?? table.getFilteredRowModel().rows.length;
  const startRow = pagination.pageIndex * pagination.pageSize + 1;
  const endRow = Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRows);

  // ✅ Не показываем если нет данных
  if (totalRows === 0) {
    return null;
  }

  // ✅ ИСПРАВЛЕНИЕ: Опционально скрываем при одной странице
  if (hideWhenSinglePage && totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-4 px-2 py-4">
      {/* Информация о записях */}
      <div className="text-sm text-muted-foreground">
        Показано {startRow}-{endRow} из {totalRows} записей
      </div>
      
      {/* Навигация */}
      <div className="flex items-center gap-6">
        {/* Информация о страницах */}
        <div className="text-sm text-muted-foreground">
          Страница {currentPage} из {totalPages}
        </div>
        
        {/* Кнопки навигации */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage() || isLoading}
            className="h-8 w-8 p-0"
            aria-label="Перейти к первой странице"
            title="Первая страница"
          >
            ≪
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || isLoading}
            aria-label="Предыдущая страница"
          >
            Назад
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || isLoading}
            aria-label="Следующая страница"
          >
            Вперед
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(totalPages - 1)}
            disabled={!table.getCanNextPage() || isLoading}
            className="h-8 w-8 p-0"
            aria-label="Перейти к последней странице"
            title="Последняя страница"
          >
            ≫
          </Button>
        </div>
      </div>
    </div>
  );
} 