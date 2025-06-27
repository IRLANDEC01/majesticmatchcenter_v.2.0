'use client';

import React, { useState } from 'react';
import { Button } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import { EntityStatusToggle, type EntityStatus } from "@/shared/admin";
import { EntitySearch } from "@/shared/ui/entity-search";
import { 
  MapTemplatesTable, 
  MapTemplateDialog, 
  useMapTemplatesData,
  useMapTemplateForm,
  type MapTemplate,
  type MapTemplateFormData
} from "@/entities/map-templates";
import { 
  archiveMapTemplateAction, 
  restoreMapTemplateAction,
  createMapTemplateAction,
  updateMapTemplateAction
} from "../api/actions.server";

/**
 * Клиентский компонент с данными (только SWR)
 */
function MapTemplatesDataProvider({ 
  onEdit,
  onArchive,
  onRestore
}: {
  onEdit: (template: MapTemplate) => void;
  onArchive: (template: MapTemplate) => Promise<void>;
  onRestore: (template: MapTemplate) => Promise<void>;
}) {
  const {
    optimisticTemplates,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    refreshData,
  } = useMapTemplatesData();

  return (
    <>
      {/* Поиск - интегрирован с хуком данных */}
      <div className="w-full sm:w-96">
        <EntitySearch
          entities="mapTemplates"
          placeholder="Поиск шаблонов карт..."
          onSearchChange={setSearchTerm}
        />
      </div>

      {/* Таблица с данными и колбэками из features слоя */}
      <MapTemplatesTable
        templates={optimisticTemplates}
        isLoading={isLoading}
        error={error}
        onEditAction={onEdit}
        onRefreshAction={refreshData}
        searchTerm={searchTerm}
        onArchiveAction={onArchive}
        onRestoreAction={onRestore}
      />
    </>
  );
}

/**
 * Основной контент страницы управления шаблонами карт.
 * 
 * Упрощенная React 19 архитектура:
 * - Только SWR для данных (нет дублирования запросов)
 * - useOptimistic для оптимистичных обновлений
 * - useTransition для pending состояний
 */
export function MapTemplatesPageContent() {
  // Состояние UI (только локальное)
  const [status, setStatus] = useState<EntityStatus>('active');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MapTemplate | undefined>(undefined);

  // Обработчики UI (определяем перед хуком)
  const handleDialogClose = () => {
    setIsCreateDialogOpen(false);
    setEditingTemplate(undefined);
  };

  const handleSuccess = () => {
    handleDialogClose();
    // Данные обновятся автоматически через optimistic updates
  };

  // Гибридный подход: useActionState в features слое
  const formManager = useMapTemplateForm({
    createAction: createMapTemplateAction,
    updateAction: updateMapTemplateAction,
    onSuccess: handleSuccess,
  });

  // FSD: Простые wrapper функции для архивации (без useActionState)
  const handleArchive = async (template: MapTemplate) => {
    const result = await archiveMapTemplateAction(template.id);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  const handleRestore = async (template: MapTemplate) => {
    const result = await restoreMapTemplateAction(template.id);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  // Обработчики действий UI
  const handleCreateNew = () => {
    setEditingTemplate(undefined);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (template: MapTemplate) => {
    setEditingTemplate(template);
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Панель управления */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Переключатель статуса */}
          <EntityStatusToggle
            value={status}
            onValueChange={setStatus}
          />
        </div>

        {/* Кнопка создания */}
        <Button 
          onClick={handleCreateNew}
          variant="default"
          size="default"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Создать шаблон
        </Button>
      </div>

      {/* SWR данные с FSD колбэками */}
      <MapTemplatesDataProvider 
        onEdit={handleEdit} 
        onArchive={handleArchive}
        onRestore={handleRestore}
      />

      {/* Диалог с гибридным подходом: useActionState + FSD колбэки */}
      <MapTemplateDialog
        isOpen={isCreateDialogOpen}
        onCloseAction={handleDialogClose}
        onSuccessAction={handleSuccess}
        template={editingTemplate}
        onCreateAction={formManager.handleCreate}
        onUpdateAction={formManager.handleUpdate}
        isCreating={formManager.isCreating}
        isUpdating={formManager.isUpdating}
        errors={formManager.errors}
      />
    </div>
  );
} 