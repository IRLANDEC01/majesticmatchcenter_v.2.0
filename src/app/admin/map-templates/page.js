'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { EntitySearch } from '@/components/ui/entity-search';
import { MapTemplateDialog } from '@/components/admin/map-templates/map-template-dialog';
import MapTemplatesTable from '@/components/admin/map-templates/map-templates-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function MapTemplatesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState(null);
  
  // Ref для доступа к функции mutate из EntitySearch
  const searchMutateRef = useRef(null);
  
  // Объединяем все состояние поиска в один объект для стабильности
  const [searchState, setSearchState] = useState({
    results: [],
    isLoading: false,
    hasActiveSearch: false,
  });

  // Обработчик результатов поиска из EntitySearch - используем useCallback с пустыми зависимостями
  const handleSearchResults = useCallback((results, meta) => {
    setSearchState({
      results: results || [],
      isLoading: meta.isLoading,
      hasActiveSearch: meta.hasSearch,
    });
    
    // Сохраняем функцию mutate для инвалидации кэша
    if (meta.mutate) {
      searchMutateRef.current = meta.mutate;
    }
  }, []); // Пустой массив зависимостей - функция никогда не изменяется

  const handleCreateNew = useCallback(() => {
    setTemplateToEdit(null);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = useCallback((template) => {
    setTemplateToEdit(template);
    setIsDialogOpen(true);
  }, []);

  const handleArchive = useCallback(async (template) => {
    try {
      const response = await fetch(
        `/api/admin/map-templates/${template._id}/archive`,
        {
          method: 'PATCH',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage =
          errorData.message || `HTTP error! status: ${response.status}`;
        toast.error(`Ошибка: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      toast.success(`Шаблон "${template.name}" успешно архивирован.`);
      
      // Инвалидируем кэш поиска для обновления результатов
      if (searchMutateRef.current) {
        searchMutateRef.current();
      }
      
    } catch (error) {
      console.error('Archive error:', error);
    }
  }, []);

  const handleDialogClose = useCallback((wasSaved) => {
    setIsDialogOpen(false);
    setTemplateToEdit(null);
    
    if (wasSaved) {
      // Инвалидируем кэш поиска для немедленного обновления результатов
      if (searchMutateRef.current) {
        searchMutateRef.current();
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Шаблоны карт</h1>

      <div className="flex items-center justify-between gap-4">
        {/* Компонент поиска без изменений */}
        <EntitySearch
          entities="mapTemplates"
          placeholder="Поиск шаблонов карт по названию..."
          onResults={handleSearchResults}
          className="w-full max-w-sm"
        />
        <Button onClick={handleCreateNew}>Создать новый</Button>
      </div>

      {/* Отображение только результатов поиска */}
      {searchState.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : searchState.hasActiveSearch ? (
        <div>
          {searchState.results.length > 0 ? (
            <MapTemplatesTable
              data={searchState.results}
              onEdit={handleEdit}
              onArchive={handleArchive}
              searchQuery={true}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-lg">Шаблоны карт не найдены</p>
              <p className="text-sm">Попробуйте изменить поисковый запрос</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-medium mb-2">Поиск шаблонов карт</h3>
            <p className="text-sm mb-4">
              Используйте поиск выше, чтобы найти нужные шаблоны карт. 
              Поиск работает по названию шаблона.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Минимум 2 символа для начала поиска
            </p>
          </div>
        </div>
      )}

      <MapTemplateDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        template={templateToEdit}
      />
    </div>
  );
} 