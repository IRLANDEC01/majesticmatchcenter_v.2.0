'use client';

import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { can, type Role } from '@/shared/lib/permissions';
import { Button, ConfirmationDialog, StatusFilter } from "@/shared/ui";
import { Plus, X } from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';
import {
  MapTemplatesTable, // ✅ ИЗМЕНЕНИЕ: Переходим на infinite scroll таблицу
  MapTemplateDialog,
  useInfiniteMapTemplatesQuery, // ✅ НОВОЕ: Infinite scroll хук
  useCreateMapTemplateMutation,
  useUpdateMapTemplateMutation,
  useArchiveMapTemplateMutation,
  useRestoreMapTemplateMutation,
  type MapTemplate,
} from "@/entities/map-templates";
import type { EntityStatus, EntityStatusOptional } from "@/shared/types/admin";
import type { MapTemplateFormValues } from '@/lib/api/schemas/map-templates/map-template-schemas';

interface MapTemplatesPageContentProps {
  // Роль теперь берется из сессии автоматически через useSession()
}

export function MapTemplatesPageContent({}: MapTemplatesPageContentProps) {
  // ✅ УПРОЩЕНО: Прямое использование useSession + can вместо usePermissions
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  
  // ✅ ИСПРАВЛЕНО: Упрощенные функции проверки прав (can() теперь работает с undefined)
  const canViewArchived = can(role, 'viewArchived');
  const canUnarchive = can(role, 'unarchive');
  const canManageEntities = can(role, 'manageEntities');
  
  const queryClient = useQueryClient();
  
  // ✅ ПОЛНАЯ ПУСТОТА: Никаких данных при заходе на страницу
  const [searchTerm, setSearchTerm] = useState('');
  
  // Визуальное состояние тогглов (undefined = ни один не выбран)
  const [visualToggleStatus, setVisualToggleStatus] = useState<EntityStatusOptional>(undefined);
  
  // Логическое состояние для запросов (undefined = никаких запросов без действий пользователя)
  const [queryStatus, setQueryStatus] = useState<EntityStatusOptional>(undefined);
  
  // Состояние диалога
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MapTemplate | undefined>(undefined);
  
  // Состояние для ошибок валидации
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Состояние для confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    template?: MapTemplate;
    action?: 'archive' | 'restore';
  }>({ isOpen: false });

  // ✅ ПОЛНАЯ ПУСТОТА: Данные загружаются только при действиях пользователя
  const shouldFetchData = Boolean(searchTerm.trim()) || queryStatus !== undefined;

  // ✅ НОВОЕ: Infinite scroll данные
  const {
    templates,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    loadMore,
    totalCount,
    refetch,
  } = useInfiniteMapTemplatesQuery({
    searchTerm,
    status: queryStatus || 'active', // ✅ Fallback для TypeScript (но enabled блокирует запрос)
    enabled: shouldFetchData, // ✅ Данные загружаются только при действиях пользователя
  });

  // ✅ РЕФАКТОРИНГ: Используем TanStack Query хуки вместо Server Actions
  const createMutation = useCreateMapTemplateMutation();
  const updateMutation = useUpdateMapTemplateMutation();
  const archiveMutation = useArchiveMapTemplateMutation();
  const restoreMutation = useRestoreMapTemplateMutation();

  // ✅ ПОИСК: Работает независимо от тогглов (автоматически выбирает 'active' при поиске)
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    
    if (value.trim()) {
      // Если есть поиск и нет выбранного тогла - автоматически ищем среди активных
      if (!queryStatus) {
        setQueryStatus('active');
      }
    } else {
      // Если поиск очищен и тоггл не был выбран пользователем - убираем queryStatus
      if (!visualToggleStatus) {
        setQueryStatus(undefined);
      }
    }
  }, [queryStatus, visualToggleStatus]);

  // ✅ ИСПРАВЛЕНО: Тоггл синхронизирует визуальное и логическое состояния
  const handleStatusChange = useCallback((newStatus: EntityStatus) => {
    setVisualToggleStatus(newStatus); // Активируем тоггл визуально
    setQueryStatus(newStatus); // Переключаем запросы на новый статус
  }, []);

  // ✅ РЕФАКТОРИНГ: Колбэки для диалога
  const handleCreateAction = useCallback(async (data: MapTemplateFormValues) => {
    try {
      setFormErrors({}); // Очищаем предыдущие ошибки
      const result = await createMutation.mutateAsync(data);
      if (result.success) {
        setIsDialogOpen(false);
        setFormErrors({}); // Очищаем ошибки при успехе
        refetch(); // Перезагружаем infinite data
        toast.success('Шаблон карты создан', { 
          description: `Шаблон "${data.name}" успешно создан` 
        });
      } else {
        // Устанавливаем ошибки валидации
        setFormErrors(result.errors || {});
        if (result.errors?.general) {
          toast.error('Ошибка создания', { 
            description: result.errors.general 
          });
        }
      }
      return result;
    } catch (error) {
      // Обрабатываем ошибки сети/сервера
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setFormErrors({ general: errorMessage });
      toast.error('Ошибка создания', { description: errorMessage });
      throw error;
    }
  }, [createMutation, refetch]);

  const handleUpdateAction = useCallback(async (id: string, data: MapTemplateFormValues) => {
    try {
      setFormErrors({}); // Очищаем предыдущие ошибки
      const result = await updateMutation.mutateAsync({ id, data });
      if (result.success) {
        setIsDialogOpen(false);
        setSelectedTemplate(undefined);
        setFormErrors({}); // Очищаем ошибки при успехе
        refetch(); // Перезагружаем infinite data
        toast.success('Шаблон карты обновлен', { 
          description: `Шаблон "${data.name}" успешно обновлен` 
        });
      } else {
        // Устанавливаем ошибки валидации
        setFormErrors(result.errors || {});
        if (result.errors?.general) {
          toast.error('Ошибка обновления', { 
            description: result.errors.general 
          });
        }
      }
      return result;
    } catch (error) {
      // Обрабатываем ошибки сети/сервера
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setFormErrors({ general: errorMessage });
      toast.error('Ошибка обновления', { description: errorMessage });
      throw error;
    }
  }, [updateMutation, refetch]);

  const handleArchiveAction = useCallback((template: MapTemplate) => {
    setConfirmDialog({
      isOpen: true,
      template,
      action: 'archive'
    });
  }, []);

  const handleRestoreAction = useCallback((template: MapTemplate) => {
    setConfirmDialog({
      isOpen: true,
      template,
      action: 'restore'
    });
  }, []);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmDialog.template || !confirmDialog.action) return;

    try {
      // ✅ ИСПРАВЛЕНО: Выполняем мутацию и ждем её завершения
      if (confirmDialog.action === 'archive') {
        await archiveMutation.mutateAsync(confirmDialog.template.id);
        toast.success('Шаблон архивирован', {
          description: `Шаблон "${confirmDialog.template.name}" помещен в архив`
        });
      } else {
        await restoreMutation.mutateAsync(confirmDialog.template.id);
        toast.success('Шаблон восстановлен', {
          description: `Шаблон "${confirmDialog.template.name}" восстановлен из архива`
        });
      }

      // ✅ ИСПРАВЛЕНО: Ждем завершения ВСЕХ операций обновления данных
      await Promise.all([
        // Инвалидируем infinite queries
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'mapTemplates'
        }),
        // Перезагружаем infinite data
        refetch()
      ]);
      
      // ✅ ИСПРАВЛЕНО: Закрываем диалог и полностью очищаем состояние после завершения ВСЕХ операций
      setConfirmDialog({ isOpen: false, template: undefined, action: undefined });
    } catch (error) {
      // Ошибки уже обрабатываются в мутациях через toast
      // Диалог остается открытым при ошибке
      console.error('Ошибка при выполнении действия:', error);
    }
  }, [confirmDialog, archiveMutation, restoreMutation, queryClient, refetch]);

  // Обработчики UI
  const handleCreateClick = () => {
    setSelectedTemplate(undefined);
    setFormErrors({}); // Очищаем ошибки при открытии
    setIsDialogOpen(true);
  };

  const handleEditClick = (template: MapTemplate) => {
    setSelectedTemplate(template);
    setFormErrors({}); // Очищаем ошибки при открытии
    setIsDialogOpen(true);
  };

  // ✅ Вычисляем общее состояние загрузки из всех мутаций
  const isMutating = createMutation.isPending || 
                   updateMutation.isPending || 
                   archiveMutation.isPending || 
                   restoreMutation.isPending;

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Шаблоны карт</h1>
          <p className="text-muted-foreground mt-1">
            Управление шаблонами карт для турниров
          </p>
        </div>
      </div>

      {/* Панель управления */}
      <div className="flex items-center justify-between gap-4 mb-6">
        {/* ✅ ИЗМЕНЕНИЕ: Добавляем поиск и фильтры для infinite scroll */}
        <div className="flex items-center gap-4">
          {/* Поиск */}
          <div className="relative">
            <input
              type="text"
              placeholder="Введите название шаблона карты..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-4 pr-10 py-2 border rounded-md w-80"
            />
            {searchTerm && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Фильтр статуса */}
          <StatusFilter
            value={visualToggleStatus} // ✅ ИСПРАВЛЕНО: Используем визуальное состояние
            onChange={handleStatusChange}
            canViewArchived={canViewArchived} // ✅ УПРОЩЕНО: Прямая проверка
            size="sm"
          />
        </div>
        
        {/* Кнопка создания */}
        <Button 
          onClick={handleCreateClick}
          disabled={isMutating}
        >
          <Plus className="mr-2 h-4 w-4" />
          Создать шаблон
        </Button>
      </div>

      {/* ✅ INFINITE SCROLL ТАБЛИЦА: Умная виртуализация + автозагрузка */}
      <MapTemplatesTable
        templates={templates}
        isLoading={isLoading}
        error={error}
        onEditAction={handleEditClick}
        searchTerm={searchTerm}
        onArchiveAction={handleArchiveAction}
        onRestoreAction={handleRestoreAction}
        // ✅ Infinite scroll props
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        loadMore={loadMore}
        totalCount={totalCount}
      />

      {/* ✅ ПУСТОЕ СОСТОЯНИЕ: Показывается когда пользователь ничего не выбрал */}
      {!shouldFetchData && !isLoading && (
        <div className="rounded-md border border-dashed border-muted-foreground/25 p-12 mx-auto max-w-2xl">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <svg className="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Начните с поиска или выберите категорию
            </h3>
           
          </div>
        </div>
      )}

      {/* Диалог создания/редактирования */}
      {isDialogOpen && (
        <MapTemplateDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSubmit={async (data) => {
            const action = selectedTemplate
              ? () => handleUpdateAction(selectedTemplate.id, data)
              : () => handleCreateAction(data);
            
            const result = await action();
            
            if (result.success) {
              setIsDialogOpen(false);
            }
          }}
          template={selectedTemplate}
          isPending={isMutating}
          errors={formErrors}
        />
      )}

      {/* Диалог подтверждения архивации/восстановления */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, template: undefined, action: undefined })} // ✅ ИСПРАВЛЕНО: Полная очистка состояния
        onConfirm={handleConfirmAction}
        title={
          confirmDialog.action === 'archive' 
            ? 'Архивировать шаблон' 
            : 'Восстановить шаблон'
        }
        description={
          confirmDialog.action === 'archive'
            ? `Вы действительно хотите убрать шаблон "${confirmDialog.template?.name}" в архив?`
            : `Вы действительно хотите сделать шаблон "${confirmDialog.template?.name}" снова активным?`
        }
        confirmText={confirmDialog.action === 'archive' ? 'Архивировать' : 'Восстановить'}
        variant={confirmDialog.action === 'archive' ? 'destructive' : 'default'}
        isPending={archiveMutation.isPending || restoreMutation.isPending}
        allowBackdropClose={!archiveMutation.isPending && !restoreMutation.isPending} // ✅ UX: Блокируем backdrop во время выполнения
      />
    </div>
  );
} 