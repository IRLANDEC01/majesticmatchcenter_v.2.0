'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/lib/db';
import mapTemplateService from '@/lib/domain/map-templates/map-template-service';
import { createMapTemplateApiSchema, updateMapTemplateApiSchema } from '@/lib/api/schemas/map-templates/map-template-schemas';

// ✅ УНИФИЦИРОВАНО: Единый тип для всех действий
export interface ActionResult {
  success: boolean;
  errors?: Record<string, string>;
}

/**
 * Server Action для создания шаблона карты
 */
export async function createMapTemplateAction(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    // ✅ ОБЯЗАТЕЛЬНО: подключение к БД
    await connectToDatabase();

    // Валидация данных формы с Zod
    const validatedFields = createMapTemplateApiSchema.safeParse({
      name: formData.get('name'),
      image: formData.get('image'),
      description: formData.get('description'),
    });

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string>,
      };
    }

    // Создание через сервисный слой
    await mapTemplateService.createMapTemplate(validatedFields.data);

    // Инвалидация кэша
    revalidatePath('/admin/map-templates');

    return {
      success: true,
    };
  } catch (error: any) {
    // Специальная обработка ConflictError для дублирующихся имен
    if (error.name === 'ConflictError') {
      return {
        success: false,
        errors: { name: error.message },
      };
    }
    
    return {
      success: false,
      errors: { general: error.message || 'Ошибка создания шаблона' },
    };
  }
}

/**
 * Server Action для обновления шаблона карты
 */
export async function updateMapTemplateAction(
  id: string,
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    // ✅ ОБЯЗАТЕЛЬНО: подключение к БД
    await connectToDatabase();

    // Валидация данных формы с Zod
    const validatedFields = updateMapTemplateApiSchema.safeParse({
      name: formData.get('name'),
      image: formData.get('image'),
      description: formData.get('description'),
    });

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string>,
      };
    }

    // Обновление через сервисный слой
    await mapTemplateService.updateMapTemplate(id, validatedFields.data);

    // Инвалидация кэша
    revalidatePath('/admin/map-templates');
    revalidatePath(`/admin/map-templates/${id}`);

    return {
      success: true,
    };
  } catch (error: any) {
    // Специальная обработка ConflictError для дублирующихся имен
    if (error.name === 'ConflictError') {
      return {
        success: false,
        errors: { name: error.message },
      };
    }
    
    return {
      success: false,
      errors: { general: error.message || 'Ошибка обновления шаблона' },
    };
  }
}

/**
 * Server Action для архивации шаблона карты
 * React 19: Заменяет fetch запрос на серверную логику
 */
export async function archiveMapTemplateAction(id: string): Promise<ActionResult> {
  try {
    // ✅ ОБЯЗАТЕЛЬНО: подключение к БД
    await connectToDatabase();

    await mapTemplateService.archiveMapTemplate(id);
    
    // Инвалидация кэша
    revalidatePath('/admin/map-templates');
    revalidatePath(`/admin/map-templates/${id}`);

    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      errors: { general: error.message || 'Ошибка архивации шаблона' }
    };
  }
}

/**
 * Server Action для восстановления шаблона карты
 * React 19: Заменяет fetch запрос на серверную логику
 */
export async function restoreMapTemplateAction(id: string): Promise<ActionResult> {
  try {
    // ✅ ОБЯЗАТЕЛЬНО: подключение к БД
    await connectToDatabase();

    await mapTemplateService.restoreMapTemplate(id);
    
    // Инвалидация кэша
    revalidatePath('/admin/map-templates');
    revalidatePath(`/admin/map-templates/${id}`);

    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      errors: { general: error.message || 'Ошибка восстановления шаблона' }
    };
  }
} 