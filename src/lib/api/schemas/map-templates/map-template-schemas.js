import { z } from 'zod';

/**
 * @desc Схема для создания нового шаблона карты.
 * Используется для валидации данных формы на клиенте и на сервере.
 */
export const createMapTemplateSchema = z.object({
  // Название шаблона. Должно быть строкой, минимум 3 символа.
  name: z.string({
    required_error: 'Название обязательно.',
  }).min(3, 'Название должно содержать минимум 3 символа.'),

  // Описание шаблона. Необязательное поле.
  description: z.string().optional(),

  // URL изображения карты. Временно принимаем что угодно для прототипа, но поле обязательно.
  mapImage: z.any().refine((val) => val !== null && val !== '' && val !== undefined, {
    message: 'Изображение карты обязательно для загрузки.',
  }),
});

/**
 * @desc Схема для обновления существующего шаблона карты.
 * Все поля опциональны, так как можно обновлять только часть данных.
 */
export const updateMapTemplateSchema = z.object({
  name: z.string().min(3, 'Название должно содержать минимум 3 символа.').optional(),
  description: z.string().optional(),
  mapImage: z.string().url('Некорректный URL изображения.').optional(),
});

/**
 * @desc Схема для валидации query-параметров при получении списка шаблонов карт.
 */
export const getMapTemplatesSchema = z.object({
  search: z.string().optional().default(''),
  status: z.enum(['active', 'archived']).default('active'),
});