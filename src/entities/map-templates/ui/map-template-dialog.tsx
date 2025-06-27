'use client';

import { useState, useTransition } from 'react';
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { toast } from "sonner";
import { MapTemplate } from '../model';

// Типы для формы
export interface MapTemplateFormData {
  name: string;
  mapTemplateImage: string;
  description?: string;
}

// Тип состояния для Server Action (из React 19)
export interface FormActionState {
  errors: Record<string, string>;
  success: boolean;
  pending?: boolean;
}

interface MapTemplateDialogProps {
  isOpen: boolean;
  onCloseAction: () => void;
  onSuccessAction: () => void;
  template?: MapTemplate; // Для редактирования
  // FSD: Правильный тип возвращаемого значения для Server Action
  onCreateAction: (data: MapTemplateFormData) => Promise<FormActionState>;
  onUpdateAction: (id: string, data: MapTemplateFormData) => Promise<FormActionState>;
  // Состояние из features слоя (useActionState)
  isCreating?: boolean;
  isUpdating?: boolean;
  errors?: Record<string, string>;
}

/**
 * Кнопка отправки с состоянием из useTransition (FSD совместимая)
 */
function SubmitButton({ template, isPending }: { template?: MapTemplate; isPending: boolean }) {
  return (
    <button 
      type="submit" 
      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
      disabled={isPending}
    >
      {isPending ? 'Сохранение...' : (template ? 'Сохранить' : 'Создать')}
    </button>
  );
}

/**
 * Компонент диалога с FSD архитектурой.
 * Использует колбэки из features слоя вместо прямых импортов.
 */
export function MapTemplateDialog({
  isOpen,
  onCloseAction,
  onSuccessAction,
  template,
  onCreateAction,
  onUpdateAction,
  isCreating = false,
  isUpdating = false,
  errors = {}
}: MapTemplateDialogProps) {
  
  // Простое состояние формы (только данные)
  const [formData, setFormData] = useState<MapTemplateFormData>({
    name: template?.name || '',
    mapTemplateImage: template?.mapTemplateImage || '',
    description: template?.description || '',
  });

  // Сброс формы при успехе
  const resetForm = () => {
    setFormData({
      name: '',
      mapTemplateImage: '',
      description: '',
    });
  };
  
  // Вычисляемое состояние загрузки
  const isPending = isCreating || isUpdating;

  // Упрощенный обработчик отправки (вся логика в features слое)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Базовая HTML валидация уже сработала
    // Бизнес-валидация будет в Server Action
    
    try {
      const result = template 
        ? await onUpdateAction(template.id, formData)
        : await onCreateAction(formData);
        
      if (result.success) {
        toast.success(template ? 'Шаблон обновлен' : 'Шаблон создан');
        
        // Сбрасываем форму только при создании нового шаблона
        if (!template) {
          resetForm();
        }
        
        onSuccessAction();
      }
      // Ошибки показываются через errors из features слоя
    } catch (error) {
      // Критические ошибки (сетевые и т.д.)
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка';
      toast.error(errorMessage);
    }
  };

  // Простой обработчик изменения полей
  const handleFieldChange = (field: keyof MapTemplateFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCloseAction()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Редактировать шаблон' : 'Создать шаблон карты'}
          </DialogTitle>
        </DialogHeader>
        
        {/* FSD: контролируемая форма с колбэками */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Название */}
          <div className="space-y-2">
            <Label htmlFor="name">Название *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleFieldChange('name')}
              placeholder="Например: de_dust2"
              required
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Изображение */}
          <div className="space-y-2">
            <Label htmlFor="mapTemplateImage">URL изображения *</Label>
            <Input
              id="mapTemplateImage"
              value={formData.mapTemplateImage}
              onChange={handleFieldChange('mapTemplateImage')}
              placeholder="https://example.com/image.jpg"
              required
            />
            {errors.mapTemplateImage && (
              <p className="text-sm text-destructive">{errors.mapTemplateImage}</p>
            )}
          </div>

          {/* Описание */}
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={handleFieldChange('description')}
              placeholder="Краткое описание карты..."
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          {/* Общие ошибки */}
          {errors.general && (
            <div className="rounded-md bg-destructive/15 p-3">
              <p className="text-sm text-destructive">{errors.general}</p>
            </div>
          )}

          {/* Кнопки */}
          <div className="flex justify-end gap-2 pt-4">
            <button 
              type="button" 
              onClick={onCloseAction}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              disabled={isPending}
            >
              Отмена
            </button>
            <SubmitButton template={template} isPending={isPending} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 