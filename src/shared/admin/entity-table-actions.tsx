'use client';

import React, { useState, useTransition } from 'react';
import { Button } from "@/shared/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";
import { 
  Edit, 
  Archive, 
  ArchiveRestore, 
  Trash2 
} from "lucide-react";
import { toast } from "sonner";

interface EntityTableActionsProps {
  entity: {
    id: string;
    name: string;
    isArchived?: boolean;
  };
  entityType: string; // 'шаблон карты', 'турнир', etc.
  onEdit: () => void;
  onArchive?: () => Promise<void>;
  onRestore?: () => Promise<void>;
  onDelete?: () => Promise<void>;
  canDelete?: boolean;
}

/**
 * Переиспользуемый компонент действий для таблиц в админ-панели.
 * Поддерживает редактирование, архивацию, восстановление и удаление.
 */
export function EntityTableActions({
  entity,
  entityType,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  canDelete = false
}: EntityTableActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleArchive = () => {
    if (!onArchive) return;
    
    startTransition(async () => {
      try {
        await onArchive();
        toast.success(`${entityType} успешно архивирован`);
      } catch (error) {
        toast.error(`Ошибка при архивации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    });
  };

  const handleRestore = () => {
    if (!onRestore) return;
    
    startTransition(async () => {
      try {
        await onRestore();
        toast.success(`${entityType} успешно восстановлен`);
      } catch (error) {
        toast.error(`Ошибка при восстановлении: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    });
  };

  const handleDelete = () => {
    if (!onDelete) return;
    
    startTransition(async () => {
      try {
        await onDelete();
        toast.success(`${entityType} успешно удален`);
        setIsDeleteDialogOpen(false);
      } catch (error) {
        toast.error(`Ошибка при удалении: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    });
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              disabled={isPending}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Редактировать</p>
          </TooltipContent>
        </Tooltip>
        
        {entity.isArchived ? (
          onRestore && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRestore}
                  disabled={isPending}
                >
                  <ArchiveRestore className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Восстановить из архива</p>
              </TooltipContent>
            </Tooltip>
          )
        ) : (
          onArchive && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleArchive}
                  disabled={isPending}
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Архивировать</p>
              </TooltipContent>
            </Tooltip>
          )
        )}

        {canDelete && onDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Удалить</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {canDelete && onDelete && (
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDelete}
          isPending={isPending}
          entityName={entity.name}
          entityType={entityType}
        />
      )}
    </TooltipProvider>
  );
} 