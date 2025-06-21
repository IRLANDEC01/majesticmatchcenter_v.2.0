'use client';

import { useState } from 'react';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapTemplateDialog } from '@/components/admin/map-templates/map-template-dialog';
import MapTemplatesTable from '@/components/admin/map-templates/map-templates-table';
import { Skeleton } from '@/components/ui/skeleton';
import { useMapTemplates } from '@/lib/hooks/use-map-templates';
import { SEARCH_DEBOUNCE_DELAY_MS } from '@/lib/constants';

export default function MapTemplatesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, SEARCH_DEBOUNCE_DELAY_MS);

  // Хук теперь вызывается с объектом и возвращает `data`
  const { data, isLoading, mutate, isError } = useMapTemplates({
    search: debouncedSearch,
  });

  const handleCreateNew = () => {
    setTemplateToEdit(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (template) => {
    setTemplateToEdit(template);
    setIsDialogOpen(true);
  };

  const handleArchive = async (template) => {
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
      // Пробрасываем ошибку, чтобы вызывающий код мог ее обработать
      // (например, чтобы не закрывать диалоговое окно)
      throw new Error(errorMessage);
    }

    toast.success(`Шаблон "${template.name}" успешно архивирован.`);
    mutate(); // SWR перезапросит данные
  };

  const handleDialogClose = (wasSaved) => {
    setIsDialogOpen(false);
    setTemplateToEdit(null);
    if (wasSaved) {
      // Если что-то сохранили, и у нас есть активный поиск, нужно обновить результаты
      if (debouncedSearch) {
        mutate();
      }
      // Если поиск пуст, то ничего делать не нужно, таблица и так пуста.
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Шаблоны карт</h1>

      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Input
            placeholder="Поиск по названию..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 flex cursor-pointer items-center rounded-r-md px-3 text-muted-foreground transition-colors hover:text-primary"
              aria-label="Очистить поиск"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>Создать новый</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <MapTemplatesTable
          // Передаем данные напрямую, т.к. API и хук возвращают массив
          data={data || []}
          onEdit={handleEdit}
          onArchive={handleArchive}
          // Передаем сам поисковый запрос, чтобы таблица могла решать, как себя вести
          searchQuery={debouncedSearch}
        />
      )}

      {isError && (
        <p className="text-red-500">
          Произошла ошибка при загрузке данных. Пожалуйста, попробуйте еще раз.
        </p>
      )}

      <MapTemplateDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        template={templateToEdit}
      />
    </div>
  );
} 