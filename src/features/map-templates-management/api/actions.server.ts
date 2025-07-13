'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/lib/db';
import mapTemplateService from '@/lib/domain/map-templates/map-template-service';
import { createMapTemplateApiSchema, updateMapTemplateApiSchema } from '@/lib/api/schemas/map-templates/map-template-schemas';
import { must } from '@/shared/lib/authorize';
import mongoose from 'mongoose';
import { auth } from '@/../auth';

// ✅ УНИФИЦИРОВАНО: Единый тип для всех действий
export interface ActionResult {
  success: boolean;
  errors?: Record<string, string>;
}

/**
 * Server Action для создания шаблона карты
 * 🛡️ ЗАЩИЩЕНО: Требует право 'manageEntities'
 */
export const createMapTemplateAction = must('manageEntities')(
  async function (
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
      const session = await auth();
      const adminId = new mongoose.Types.ObjectId(session!.user!.id);
      await mapTemplateService.createMapTemplate(validatedFields.data, adminId);

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
);

/**
 * Server Action для обновления шаблона карты
 * 🛡️ ЗАЩИЩЕНО: Требует право 'manageEntities'
 */
export const updateMapTemplateAction = must('manageEntities')(
  async function (
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
      const session = await auth();
      const adminId = new mongoose.Types.ObjectId(session!.user!.id);
      await mapTemplateService.updateMapTemplate(id, validatedFields.data, adminId);

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
);

/**
 * Server Action для архивации шаблона карты
 * 🛡️ ЗАЩИЩЕНО: Требует право 'manageEntities'
 * React 19: Заменяет fetch запрос на серверную логику
 */
export const archiveMapTemplateAction = must('manageEntities')(
  async function (id: string): Promise<ActionResult> {
    try {
      // ✅ ОБЯЗАТЕЛЬНО: подключение к БД
      await connectToDatabase();

      const session = await auth();
      const adminId = new mongoose.Types.ObjectId(session!.user!.id);
      await mapTemplateService.archiveMapTemplate(id, adminId);
      
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
);

/**
 * Server Action для восстановления шаблона карты
 * 🛡️ ЗАЩИЩЕНО: Требует право 'manageEntities'
 * React 19: Заменяет fetch запрос на серверную логику
 */
export const restoreMapTemplateAction = must('manageEntities')(
  async function (id: string): Promise<ActionResult> {
    try {
      // ✅ ОБЯЗАТЕЛЬНО: подключение к БД
      await connectToDatabase();

      const session = await auth();
      const adminId = new mongoose.Types.ObjectId(session!.user!.id);
      await mapTemplateService.restoreMapTemplate(id, adminId);
      
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
);