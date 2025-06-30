'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { FileDropzone } from "@/shared/ui/file-dropzone";
import {
  mapTemplateFormSchema,
  createMapTemplateFormSchema,
  type MapTemplateFormValues
} from '@/lib/api/schemas/map-templates/map-template-schemas';
import type { MapTemplate } from '../model/types';

interface MapTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MapTemplateFormValues) => Promise<void>;
  template?: MapTemplate | null;
  isPending: boolean;
}

export function MapTemplateDialog({
  isOpen,
  onClose,
  onSubmit,
  template,
  isPending,
}: MapTemplateDialogProps) {

  const isEditMode = !!template;
  const validationSchema = isEditMode ? mapTemplateFormSchema : createMapTemplateFormSchema;

  const form = useForm<MapTemplateFormValues>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      name: '',
      description: '',
      image: null,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (template) {
        form.reset({
          name: template.name,
          description: template.description || '',
          image: template.imageUrls?.medium || null,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          image: null,
        });
      }
    }
  }, [isOpen, template, form]);

  const handleFormSubmit = async (data: MapTemplateFormValues) => {
    try {
      await onSubmit(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла неизвестная ошибка';
      toast.error('Ошибка сохранения', { description: errorMessage });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Редактировать шаблон' : 'Создать шаблон карты'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Название шаблона <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Введите название шаблона карты..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Краткое описание карты..."
                      rows={3}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                   <FormLabel>
                    Изображение карты <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <FileDropzone
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isPending}
                      placeholder="Загрузить изображение"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={isPending}
              >
                {isPending ? 'Сохранение...' : (template ? 'Сохранить' : 'Создать')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}