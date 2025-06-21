'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createMapTemplateSchema } from '@/lib/api/schemas/map-templates/map-template-schemas';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ImageUploader from '@/components/ui/image-uploader';
import { Skeleton } from '@/components/ui/skeleton';
import { SubmitButton } from '@/components/ui/submit-button';

// Шаг 1: Выносим форму в отдельный, стабильный компонент.
const MapTemplateForm = ({ form, isEditMode, isSubmitting, onSubmit, onClose }) => {
  const { control, handleSubmit, formState: { isDirty } } = form;

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={isSubmitting} className="space-y-4">
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Название <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Например, Dust II" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Описание</FormLabel>
                <FormControl>
                  <Textarea placeholder="Краткое описание карты..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="mapImage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Изображение карты <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <ImageUploader value={field.value} onFileSelect={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={isSubmitting}>
            Отмена
          </Button>
          <SubmitButton
            isSubmitting={isSubmitting}
            disabled={isEditMode ? !isDirty || isSubmitting : isSubmitting}
            submittingText={isEditMode ? 'Сохранение...' : 'Создание...'}
          >
            {isEditMode ? 'Сохранить изменения' : 'Создать шаблон'}
          </SubmitButton>
        </DialogFooter>
      </form>
    </Form>
  );
};


export function MapTemplateDialog({ isOpen, onClose, template, isLoading }) {
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = Boolean(template);

  const form = useForm({
    resolver: zodResolver(createMapTemplateSchema),
    defaultValues: {
      name: '',
      description: '',
      mapImage: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      setIsSubmitting(false); // Сбрасываем состояние при открытии
      if (isEditMode && template) {
        form.reset({
          name: template.name || '',
          description: template.description || '',
          mapImage: template.mapImage || '',
        });
      } else {
        form.reset({
          name: '',
          description: '',
          mapImage: '',
        });
      }
    }
  }, [isOpen, isEditMode, template, form]);

  async function onSubmit(values) {
    setServerError(null);
    setIsSubmitting(true);

    const submissionValues = { ...values };
    
    if (submissionValues.mapImage && typeof submissionValues.mapImage === 'object') {
      const placeholders = [
        '/images/map-placeholders/map-1.webp',
        '/images/map-placeholders/map-2.webp',
        '/images/map-placeholders/map-3.webp',
      ];
      const randomIndex = Math.floor(Math.random() * placeholders.length);
      submissionValues.mapImage = placeholders[randomIndex];
    }

    const url = isEditMode ? `/api/admin/map-templates/${template._id}` : '/api/admin/map-templates';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionValues),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const message = errorData.message || 'Произошла ошибка';
        if (response.status === 409) {
          form.setError('name', { type: 'manual', message });
        } else {
          setServerError(message);
        }
        toast.error(isEditMode ? 'Ошибка при обновлении' : 'Ошибка при создании', {
          description: message,
        });
        return;
      }

      toast.success(isEditMode ? 'Шаблон карты успешно обновлен!' : 'Шаблон карты успешно создан!');
      onClose(true); // Закрываем только после успеха
    } catch (error) {
      console.error(error);
      const message = 'Произошла непредвиденная ошибка.';
      setServerError(message);
      toast.error('Критическая ошибка', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose(false);
    }
  };
  
  const DialogSkeleton = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[425px]"
        onPointerDownOutside={(e) => {
          if (isSubmitting) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Редактировать шаблон' : 'Создать новый шаблон'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Внесите изменения в информацию о шаблоне карты.'
              : 'Заполните информацию о новом шаблоне карты.'}
          </DialogDescription>
          {serverError && <div className="text-sm font-medium text-destructive">{serverError}</div>}
        </DialogHeader>
        {isLoading ? <DialogSkeleton /> : <MapTemplateForm form={form} isEditMode={isEditMode} isSubmitting={isSubmitting} onSubmit={onSubmit} onClose={handleClose} />}
      </DialogContent>
    </Dialog>
  );
} 