'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { createMapTemplateAction, updateMapTemplateAction } from '@/features/map-templates-management/api/actions.server';
import { toast } from "sonner";
import { useEffect } from 'react';
import { MapTemplate } from '../model';

interface MapTemplateDialogProps {
  isOpen: boolean;
  onCloseAction: () => void;
  onSuccessAction: () => void;
  template?: MapTemplate; // Для редактирования
}

/**
 * Кнопка отправки с состоянием из useFormStatus (React 19)
 */
function SubmitButton({ template }: { template?: MapTemplate }) {
  const { pending } = useFormStatus();
  
  return (
    <button 
      type="submit" 
      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
      disabled={pending}
    >
      {pending ? 'Сохранение...' : (template ? 'Сохранить' : 'Создать')}
    </button>
  );
}

/**
 * Внутренний компонент диалога без client-entry проблем.
 * Родительский компонент управляет состоянием и передает callbacks.
 */
export function MapTemplateDialog({
  isOpen,
  onCloseAction,
  onSuccessAction,
  template
}: MapTemplateDialogProps) {
  
  // React 19: useActionState для управления состоянием формы
  const [state, formAction] = useActionState(
    template 
      ? updateMapTemplateAction.bind(null, template.id)
      : createMapTemplateAction,
    {
      errors: {},
      success: false,
    }
  );

  // Обработка успешного создания/обновления
  useEffect(() => {
    if (state.success) {
      toast.success(template ? 'Шаблон обновлен' : 'Шаблон создан');
      onSuccessAction();
    }
  }, [state.success, template, onSuccessAction]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCloseAction()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Редактировать шаблон' : 'Создать шаблон карты'}
          </DialogTitle>
        </DialogHeader>
        
        {/* React 19: форма с action вместо onSubmit */}
        <form action={formAction} className="space-y-4">
          {/* Название */}
          <div className="space-y-2">
            <Label htmlFor="name">Название *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={template?.name || ''}
              placeholder="Например: de_dust2"
              required
            />
            {state.errors?.name && (
              <p className="text-sm text-destructive">{state.errors.name}</p>
            )}
          </div>

          {/* Изображение */}
          <div className="space-y-2">
            <Label htmlFor="mapTemplateImage">URL изображения *</Label>
            <Input
              id="mapTemplateImage"
              name="mapTemplateImage"
              defaultValue={template?.mapTemplateImage || ''}
              placeholder="https://example.com/image.jpg"
              required
            />
            {state.errors?.mapTemplateImage && (
              <p className="text-sm text-destructive">{state.errors.mapTemplateImage}</p>
            )}
          </div>

          {/* Описание */}
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={template?.description || ''}
              placeholder="Краткое описание карты..."
              rows={3}
            />
            {state.errors?.description && (
              <p className="text-sm text-destructive">{state.errors.description}</p>
            )}
          </div>

          {/* Общие ошибки */}
          {state.errors?.general && (
            <div className="rounded-md bg-destructive/15 p-3">
              <p className="text-sm text-destructive">{state.errors.general}</p>
            </div>
          )}

          {/* Кнопки */}
          <div className="flex justify-end gap-2 pt-4">
            <button 
              type="button" 
              onClick={onCloseAction}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Отмена
            </button>
            <SubmitButton template={template} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 