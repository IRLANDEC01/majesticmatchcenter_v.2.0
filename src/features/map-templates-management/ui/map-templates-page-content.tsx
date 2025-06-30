'use client';

import React, { useState, useCallback } from 'react';
import { Button } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import { usePermissions } from "@/shared/hooks/use-permissions";
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
import type { AdminRole, EntityStatus } from "@/shared/types/admin";
import type { MapTemplateFormValues } from '@/lib/api/schemas/map-templates/map-template-schemas';

interface MapTemplatesPageContentProps {
  userRole: AdminRole;
}

export function MapTemplatesPageContent({ userRole }: MapTemplatesPageContentProps) {
  const permissions = usePermissions(userRole);
  const queryClient = useQueryClient();
  
  // ✅ ИЗМЕНЕНИЕ: Переходим на infinite scroll - локальный state для фильтров
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<EntityStatus>('active');
  
  // ✅ ДОБАВЛЕНО: Состояние для явного управления загрузкой данных
  const [shouldLoadData, setShouldLoadData] = useState(false);
  
  // Состояние диалога
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MapTemplate | undefined>(undefined);
  
  // ✅ ДОБАВЛЕНО: Состояние для ошибок валидации
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ✅ ИСПРАВЛЕНО: Данные загружаются только при явном действии
  const shouldFetchData = shouldLoadData || 
    searchTerm.trim().length >= 2 || 
    status !== 'active';

  // ✅ НОВОЕ: Infinite scroll данные - НЕ загружаются автоматически
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
    status,
    enabled: shouldFetchData, // ✅ КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: enabled управляется явно
  });

  // ✅ РЕФАКТОРИНГ: Используем TanStack Query хуки вместо Server Actions
  const createMutation = useCreateMapTemplateMutation();
  const updateMutation = useUpdateMapTemplateMutation();
  const archiveMutation = useArchiveMapTemplateMutation();
  const restoreMutation = useRestoreMapTemplateMutation();

  // ✅ ДОБАВЛЕНО: Обработчики для активации загрузки данных
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    // Активируем загрузку если есть поиск от 2 символов
    if (value.trim().length >= 2) {
      setShouldLoadData(true);
    }
  }, []);

  const handleStatusChange = useCallback((newStatus: EntityStatus) => {
    setStatus(newStatus);
    // Активируем загрузку при изменении фильтра (кроме active)
    if (newStatus !== 'active') {
      setShouldLoadData(true);
    }
  }, []);

  const handleShowAll = useCallback(() => {
    setShouldLoadData(true);
    setSearchTerm('');
    setStatus('active');
  }, []);

  // ✅ РЕФАКТОРИНГ: Колбэки для диалога
  const handleCreateAction = useCallback(async (data: MapTemplateFormValues) => {
    try {
      setFormErrors({}); // Очищаем предыдущие ошибки
      console.log('🔍 Отправляем данные:', data); // Отладка
      const result = await createMutation.mutateAsync(data);
      console.log('🔍 Результат мутации:', result); // Отладка
      if (result.success) {
        setIsDialogOpen(false);
        setFormErrors({}); // Очищаем ошибки при успехе
        refetch(); // ✅ Перезагружаем infinite data
      } else {
        // Устанавливаем ошибки валидации
        console.log('🚨 Ошибки валидации:', result.errors); // Отладка
        setFormErrors(result.errors || {});
      }
      return result;
    } catch (error) {
      // Обрабатываем ошибки сети/сервера
      console.error('🚨 Ошибка в handleCreateAction:', error); // Отладка
      setFormErrors({ general: error instanceof Error ? error.message : 'Неизвестная ошибка' });
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
        refetch(); // ✅ Перезагружаем infinite data
      } else {
        // Устанавливаем ошибки валидации
        setFormErrors(result.errors || {});
      }
      return result;
    } catch (error) {
      // Обрабатываем ошибки сети/сервера
      setFormErrors({ general: error instanceof Error ? error.message : 'Неизвестная ошибка' });
      throw error;
    }
  }, [updateMutation, refetch]);

  const handleArchiveAction = useCallback(async (template: MapTemplate) => {
    await archiveMutation.mutateAsync(template.id);
    // ✅ ИЗМЕНЕНИЕ: Инвалидируем infinite queries
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'mapTemplates'
    });
    refetch(); // ✅ Перезагружаем infinite data
  }, [archiveMutation, queryClient, refetch]);

  const handleRestoreAction = useCallback(async (template: MapTemplate) => {
    await restoreMutation.mutateAsync(template.id);
    // ✅ ИЗМЕНЕНИЕ: Инвалидируем infinite queries
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'mapTemplates'
    });
    refetch(); // ✅ Перезагружаем infinite data
  }, [restoreMutation, queryClient, refetch]);

  // ✅ СЕРВЕРНАЯ ПАГИНАЦИЯ: Данные управляются серверной таблицей через URL

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
              placeholder="Введите шаблона карты..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-4 pr-4 py-2 border rounded-md w-80"
            />
          </div>
          
          {/* Фильтр статуса */}
          {permissions.canViewArchived && (
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as EntityStatus)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="active">Активные</option>
              <option value="archived">Архивные</option>
              <option value="all">Все</option>
            </select>
          )}

          {/* ✅ ДОБАВЛЕНО: Кнопка "Показать все" */}
          {!shouldLoadData && (
            <Button 
              variant="outline"
              onClick={handleShowAll}
              disabled={isMutating}
            >
              Показать все
            </Button>
          )}
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

      {/* ✅ ДОБАВЛЕНО: Пустое состояние когда данные не загружены */}
      {!shouldFetchData && !isLoading && (
        <div className="rounded-md border border-dashed border-muted-foreground/25 p-12">
          <div className="text-center">
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Используйте поиск или фильтры
            </h3>
            <p className="text-sm text-muted-foreground/75 mb-4">
              Введите запрос в поиске (мин. 2 символа), выберите статус или нажмите &quot;Показать все&quot;
            </p>
            <Button 
              variant="outline"
              onClick={handleShowAll}
              disabled={isMutating}
            >
              Показать все шаблоны
            </Button>
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
        />
      )}
    </div>
  );
} 