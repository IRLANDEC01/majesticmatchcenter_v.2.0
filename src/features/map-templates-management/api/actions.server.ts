'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import mapTemplateService from '@/lib/domain/map-templates/map-template-service';
import { createMapTemplateSchema, updateMapTemplateSchema } from '@/lib/api/schemas/map-templates/map-template-schemas';

// Типы для состояния действий
export interface ActionState {
  errors: Record<string, string>;
  success: boolean;
}

/**
 * Server Action для создания шаблона карты
 */
export async function createMapTemplateAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Валидация данных формы с Zod
    const validatedFields = createMapTemplateSchema.safeParse({
      name: formData.get('name'),
      mapTemplateImage: formData.get('mapTemplateImage'),
      description: formData.get('description'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string>,
        success: false,
      };
    }

    // Создание через сервисный слой
    await mapTemplateService.createMapTemplate(validatedFields.data);

    // Инвалидация кэша
    revalidatePath('/admin/map-templates');

    return {
      errors: {},
      success: true,
    };
  } catch (error: any) {
    return {
      errors: { general: error.message || 'Ошибка создания шаблона' },
      success: false,
    };
  }
}

/**
 * Server Action для обновления шаблона карты
 */
export async function updateMapTemplateAction(
  id: string,
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Валидация данных формы с Zod
    const validatedFields = updateMapTemplateSchema.safeParse({
      name: formData.get('name'),
      mapTemplateImage: formData.get('mapTemplateImage'),
      description: formData.get('description'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string>,
        success: false,
      };
    }

    // Обновление через сервисный слой
    await mapTemplateService.updateMapTemplate(id, validatedFields.data);

    // Инвалидация кэша
    revalidatePath('/admin/map-templates');
    revalidatePath(`/admin/map-templates/${id}`);

    return {
      errors: {},
      success: true,
    };
  } catch (error: any) {
    return {
      errors: { general: error.message || 'Ошибка обновления шаблона' },
      success: false,
    };
  }
}

/**
 * Server Action для архивации шаблона карты
 * React 19: Заменяет fetch запрос на серверную логику
 */
export async function archiveMapTemplateAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await mapTemplateService.archiveMapTemplate(id);
    
    // Инвалидация кэша
    revalidatePath('/admin/map-templates');
    revalidatePath(`/admin/map-templates/${id}`);

    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Ошибка архивации шаблона' 
    };
  }
}

/**
 * Server Action для восстановления шаблона карты
 * React 19: Заменяет fetch запрос на серверную логику
 */
export async function restoreMapTemplateAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await mapTemplateService.restoreMapTemplate(id);
    
    // Инвалидация кэша
    revalidatePath('/admin/map-templates');
    revalidatePath(`/admin/map-templates/${id}`);

    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Ошибка восстановления шаблона' 
    };
  }
} 