'use server'

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import mapTemplateService from '@/lib/domain/map-templates/map-template-service';
import { createMapTemplateSchema, updateMapTemplateSchema } from '@/lib/api/schemas/map-templates/map-template-schemas';
import { mapTemplateToDto, type MapTemplate } from '@/entities/map-templates';

interface ActionState {
  success?: boolean;
  errors?: Record<string, string>;
  data?: MapTemplate; // ✅ Теперь строго типизированo
}

/**
 * Server Action для создания шаблона карты (React 19)
 */
export async function createMapTemplateAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Валидация данных формы
    const rawData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      mapTemplateImage: formData.get('mapTemplateImage') as string,
    };

    const validatedData = createMapTemplateSchema.parse(rawData);
    
    // Создание через сервис
    const newTemplate = await mapTemplateService.createMapTemplate(validatedData);
    
    // Инвалидация кэша
    revalidateTag('map-templates');
    
    return {
      success: true,
      data: mapTemplateToDto(newTemplate), // ✅ Преобразуем в clean DTO
    };
  } catch (error) {
    console.error('Ошибка создания шаблона карты:', error);
    
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      return {
        success: false,
        errors: fieldErrors,
      };
    }

    return {
      success: false,
      errors: {
        general: error instanceof Error ? error.message : 'Неизвестная ошибка',
      },
    };
  }
}

/**
 * Server Action для обновления шаблона карты
 */
export async function updateMapTemplateAction(
  templateId: string,
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const rawData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      mapTemplateImage: formData.get('mapTemplateImage') as string,
    };

    const validatedData = updateMapTemplateSchema.parse(rawData);
    
    const updatedTemplate = await mapTemplateService.updateMapTemplate(templateId, validatedData);
    
    revalidateTag('map-templates');
    revalidateTag(`map-template:${templateId}`);
    
    return {
      success: true,
      data: mapTemplateToDto(updatedTemplate), // ✅ Преобразуем в clean DTO
    };
  } catch (error) {
    console.error('Ошибка обновления шаблона карты:', error);
    
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      return {
        success: false,
        errors: fieldErrors,
      };
    }

    return {
      success: false,
      errors: {
        general: error instanceof Error ? error.message : 'Неизвестная ошибка',
      },
    };
  }
} 