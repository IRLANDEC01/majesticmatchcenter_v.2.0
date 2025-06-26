import { z } from 'zod';

const idSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Невалидный ID');

/**
 * @desc Схема для создания нового шаблона карты.
 * Используется для валидации данных формы на клиенте и на сервере.
 */
export const createMapTemplateSchema = z.object({
  name: z
    .string({
      required_error: 'Название обязательно.',
    })
    .min(3, 'Название должно содержать минимум 3 символа')
    .max(50, 'Название не должно превышать 50 символов'),
  mapTemplateImage: z.string().url('Некорректный URL изображения.'),
  description: z.string().max(500, 'Описание не может превышать 500 символов').optional(),
});

// Выводим тип из схемы для использования в коде
export type CreateMapTemplateDto = z.infer<typeof createMapTemplateSchema>;

/**
 * @desc Схема для обновления существующего шаблона карты.
 * Все поля опциональны, так как можно обновлять только часть данных.
 */
export const updateMapTemplateSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  mapTemplateImage: z.string().url('Некорректный URL изображения').optional(),
  description: z.string().max(500).optional(),
});

// Выводим тип из схемы для использования в коде
export type UpdateMapTemplateDto = z.infer<typeof updateMapTemplateSchema>;

/**
 * @desc Схема для валидации query-параметров при получении списка шаблонов карт.
 */
export const getMapTemplatesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  q: z.string().optional(),
  status: z.enum(['active', 'archived', 'all']).default('active'),
});

// Выводим тип из схемы для использования в коде
export type GetMapTemplatesDto = z.infer<typeof getMapTemplatesSchema>; 