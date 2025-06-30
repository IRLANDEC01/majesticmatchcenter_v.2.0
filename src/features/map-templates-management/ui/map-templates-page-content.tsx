'use client';

import React, { useState, useCallback } from 'react';
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Plus, Search, X } from "lucide-react";
import { StatusFilter } from "@/shared/ui/status-filter";
import { usePermissions } from "@/shared/hooks/use-permissions";
import { useQueryClient } from '@tanstack/react-query';
import {
  MapTemplatesTable,
  MapTemplateDialog,
  useMapTemplatesQuery,
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
  
  // ✅ УПРОЩЕНО: Убираем дублированный debounce (он уже в useMapTemplatesQuery)
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<EntityStatus>('active');
  
  // Состояние диалога
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MapTemplate | undefined>(undefined);
  
  // ✅ ДОБАВЛЕНО: Состояние для ошибок валидации
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ✅ РЕФАКТОРИНГ: Используем TanStack Query хуки вместо Server Actions
  const createMutation = useCreateMapTemplateMutation();
  const updateMutation = useUpdateMapTemplateMutation();
  const archiveMutation = useArchiveMapTemplateMutation();
  const restoreMutation = useRestoreMapTemplateMutation();

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
  }, [createMutation]);

  const handleUpdateAction = useCallback(async (id: string, data: MapTemplateFormValues) => {
    try {
      setFormErrors({}); // Очищаем предыдущие ошибки
      const result = await updateMutation.mutateAsync({ id, data });
      if (result.success) {
        setIsDialogOpen(false);
        setSelectedTemplate(undefined);
        setFormErrors({}); // Очищаем ошибки при успехе
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
  }, [updateMutation]);

  const handleArchiveAction = useCallback(async (template: MapTemplate) => {
    await archiveMutation.mutateAsync(template.id);
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'mapTemplates'
    });
  }, [archiveMutation, queryClient]);

  const handleRestoreAction = useCallback(async (template: MapTemplate) => {
    await restoreMutation.mutateAsync(template.id);
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'mapTemplates'
    });
  }, [restoreMutation, queryClient]);

  // ✅ ОБНОВЛЕНО: Получение данных через TanStack Query (debounce внутри хука)
  const { 
    data: templates = [], 
    isLoading, 
    error,
  } = useMapTemplatesQuery({
    searchTerm, // Без debounce - он внутри хука
    status,
    enabled: true,
  });

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

  const handleSearchClear = () => {
    setSearchTerm('');
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
        {/* Поиск */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            placeholder="Поиск шаблонов карт..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
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
          onChange={setStatus}
          canViewArchived={permissions.canViewArchived}
        />

        {/* Кнопка создания */}
        <Button 
          onClick={handleCreateClick}
          disabled={isMutating}
        >
          <Plus className="mr-2 h-4 w-4" />
          Создать шаблон
        </Button>
      </div>

      {/* ✅ РЕФАКТОРИНГ: Таблица использует мутации вместо Server Actions */}
      <MapTemplatesTable
        templates={templates}
        isLoading={isLoading || isMutating}
        error={error}
        onEditAction={handleEditClick}
        searchTerm={searchTerm} // Передаем оригинальный searchTerm для подсветки
        onArchiveAction={handleArchiveAction}
        onRestoreAction={handleRestoreAction}
      />

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