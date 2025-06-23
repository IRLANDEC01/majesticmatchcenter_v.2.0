import { z } from 'zod';

/**
 * @desc Схема для создания нового шаблона карты.
 * Используется для валидации данных формы на клиенте и на сервере.
 */
export const createMapTemplateSchema = z.object({
  // Название шаблона. Должно быть строкой, минимум 3 символа.
  name: z.string({
    required_error: 'Название обязательно.',
  }).min(3, 'Название должно содержать минимум 3 символа.')
    .regex(/^[a-zA-Z0-9\s]+$/, 'Название может содержать только латинские буквы, цифры и пробелы.'),

  // Slug. Необязательное поле, т.к. может генерироваться на сервере.
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, 'Slug может содержать только строчные латинские буквы, цифры и дефисы.')
    .optional(),

  // Описание шаблона. Необязательное поле.
  description: z.string().max(1000, 'Описание не может превышать 1000 символов.').optional(),

  // URL изображения карты. Обязательное непустое строковое поле.
  mapTemplateImage: z.string({
    required_error: 'Изображение для шаблона карты обязательно.',
  }).nonempty('Изображение для шаблона карты обязательно.'),
});

// Выводим тип из схемы для использования в коде
export type CreateMapTemplateDto = z.infer<typeof createMapTemplateSchema>;

/**
 * @desc Схема для обновления существующего шаблона карты.
 * Все поля опциональны, так как можно обновлять только часть данных.
 */
export const updateMapTemplateSchema = z.object({
  name: z.string().min(3).regex(/^[a-zA-Z0-9\s]+$/, 'Название может содержать только латинские буквы, цифры и пробелы.').optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug может содержать только строчные латинские буквы, цифры и дефисы.').optional(),
  description: z.string().max(1000).optional(),
  mapTemplateImage: z.string().nonempty('Изображение не может быть пустым.').optional(),
});

// Выводим тип из схемы для использования в коде
export type UpdateMapTemplateDto = z.infer<typeof updateMapTemplateSchema>;

/**
 * @desc Схема для валидации query-параметров при получении списка шаблонов карт.
 */
export const getMapTemplatesSchema = z.object({
  // Поисковый запрос для фильтрации по имени
  q: z.string().optional(),

  // Статус для фильтрации (активные или архивные)
  status: z.enum(['active', 'archived']).default('active'),
});

// Выводим тип из схемы для использования в коде
export type GetMapTemplatesDto = z.infer<typeof getMapTemplatesSchema>; 