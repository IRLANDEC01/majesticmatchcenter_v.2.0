'use client';

import React, { useState, useTransition } from 'react';
import Image from 'next/image';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import { 
  Edit, 
  Archive, 
  ArchiveRestore, 
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { MapTemplate } from '../model';

interface MapTemplatesTableProps {
  templates: MapTemplate[];
  isLoading: boolean;
  error?: Error | null;
  onEditAction: (template: MapTemplate) => void;
  onRefreshAction: () => void;
  searchTerm: string;
  // FSD: Колбэки вместо прямых импортов из features слоя
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
  onRefreshAction,
  searchTerm,
  onArchiveAction,
  onRestoreAction
}: MapTemplatesTableProps) {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  // FSD: Используем колбэк из features слоя
  const handleArchive = async (template: MapTemplate) => {
    if (processingIds.has(template.id) || isPending) return;
    
    setProcessingIds(prev => new Set([...prev, template.id]));
    
    startTransition(async () => {
      try {
        await onArchiveAction(template);
        toast.success('Шаблон карты успешно архивирован');
        onRefreshAction();
      } catch (error) {
        toast.error(`Ошибка архивации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      } finally {
        setProcessingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(template.id);
          return newSet;
        });
      }
    });
  };

  // FSD: Используем колбэк из features слоя
  const handleRestore = async (template: MapTemplate) => {
    if (processingIds.has(template.id) || isPending) return;
    
    setProcessingIds(prev => new Set([...prev, template.id]));
    
    startTransition(async () => {
      try {
        await onRestoreAction(template);
        toast.success('Шаблон карты успешно восстановлен');
        onRefreshAction();
      } catch (error) {
        toast.error(`Ошибка восстановления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      } finally {
        setProcessingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(template.id);
          return newSet;
        });
      }
    });
  };

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
        <Button variant="outline" size="default" onClick={onRefreshAction}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Попробовать еще раз
        </Button>
      </div>
    );
  }

  // Пустое состояние - показываем кнопку обновить только если нет поискового запроса
  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          {searchTerm.length > 0 
            ? `По запросу "${searchTerm}" ничего не найдено`
            : 'Введите запрос для поиска шаблонов карт'
          }
        </p>
        {!searchTerm && (
          <Button variant="outline" size="default" onClick={onRefreshAction}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
        )}
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
              const isProcessing = processingIds.has(template.id);
              
              return (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {template.mapTemplateImage && (
                        <Image
                          src={template.mapTemplateImage}
                          alt={template.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded object-cover"
                          unoptimized={template.mapTemplateImage.startsWith('http')}
                        />
                      )}
                      <div>
                        <div className="font-medium">{template.name}</div>
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
                    <div className="flex items-center justify-end gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditAction(template)}
                            disabled={isProcessing || isPending}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Редактировать</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      {template.isArchived ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(template)}
                              disabled={isProcessing || isPending}
                            >
                              {isProcessing ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <ArchiveRestore className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Восстановить</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleArchive(template)}
                              disabled={isProcessing || isPending}
                            >
                              {isProcessing ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Archive className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Архивировать</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
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