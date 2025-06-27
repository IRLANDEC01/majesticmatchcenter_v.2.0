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
  type MapTemplate
} from "@/entities/map-templates";

/**
 * Основной контент страницы управления шаблонами карт.
 * Содержит поиск, фильтры, таблицу и диалог создания/редактирования.
 */
export function MapTemplatesPageContent() {
  // Состояние UI
  const [status, setStatus] = useState<EntityStatus>('active');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MapTemplate | undefined>(undefined);
  
  // Хук данных с React 19 паттернами
  const {
    optimisticTemplates,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    refreshData,
  } = useMapTemplatesData();

  // Обработчики действий
  const handleCreateNew = () => {
    setEditingTemplate(undefined);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (template: MapTemplate) => {
    setEditingTemplate(template);
    setIsCreateDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsCreateDialogOpen(false);
    setEditingTemplate(undefined);
  };

  const handleSuccess = () => {
    handleDialogClose();
    refreshData();
  };

  // Обработчики поиска
  const handleSearchResults = (results: any[] | Record<string, any[]>, meta: { isLoading: boolean; isError: any; hasSearch: boolean; canSearch: boolean; mutate: () => void }) => {
    // Результаты поиска обрабатываются автоматически в хуке
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
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
          
          {/* Поиск */}
          <div className="w-full sm:w-96">
            <EntitySearch
              entities="mapTemplates"
              placeholder="Поиск шаблонов карт..."
              onResults={handleSearchResults}
              onSearchChange={handleSearchChange}
            />
          </div>
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

      {/* Таблица результатов */}
      <MapTemplatesTable
        templates={optimisticTemplates}
        isLoading={isLoading}
        error={error}
        onEditAction={handleEdit}
        onRefreshAction={refreshData}
        searchTerm={searchTerm}
      />

      {/* Диалог создания/редактирования */}
      <MapTemplateDialog
        isOpen={isCreateDialogOpen}
        onCloseAction={handleDialogClose}
        onSuccessAction={handleSuccess}
        template={editingTemplate}
      />
    </div>
  );
} 