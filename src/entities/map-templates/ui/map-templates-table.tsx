'use client';

import React from 'react';
import Image from 'next/image';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Badge } from "@/shared/ui/badge";
import { 
  TooltipProvider,
} from "@/shared/ui/tooltip";
import { 
  RefreshCw, 
  AlertCircle,
} from "lucide-react";
import { EntityTableActions } from "@/shared/admin/entity-table-actions";
import type { MapTemplate } from '../model/types';

interface MapTemplatesTableProps {
  templates: MapTemplate[];
  isLoading: boolean;
  error: any;
  onEditAction: (template: MapTemplate) => void;
  searchTerm: string;
  onArchiveAction: (template: MapTemplate) => Promise<void>;
  onRestoreAction: (template: MapTemplate) => Promise<void>;
}

/**
 * Таблица шаблонов карт с действиями и tooltips.
 * Поддерживает редактирование, архивацию и восстановление.
 * React 19: Использует Server Actions вместо fetch запросов.
 */
export function MapTemplatesTable({
  templates,
  isLoading,
  error,
  onEditAction,
  searchTerm,
  onArchiveAction,
  onRestoreAction,
}: MapTemplatesTableProps) {
  // ✅ EntityTableActions использует собственное состояние isPending

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
            : 'Введите запрос для поиска шаблонов карт'
          }
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Создан</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => {
              return (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {template.imageUrls?.icon && (
                        <Image
                          src={template.imageUrls.icon}
                          alt={template.name}
                          width={32}
                          height={32}
                          className="h-8 w-8 object-cover rounded border border-border"
                        />
                      )}
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.isArchived ? 'archived' : 'success'}>
                      {template.isArchived ? 'Архивирован' : 'Активен'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(template.createdAt).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <EntityTableActions
                        entity={{
                          id: template.id,
                          name: template.name,
                          isArchived: template.isArchived
                        }}
                        entityType="шаблон карты"
                        onEdit={() => onEditAction(template)}
                        onArchive={() => onArchiveAction(template)}
                        onRestore={() => onRestoreAction(template)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
} 