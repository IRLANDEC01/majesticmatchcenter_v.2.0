import { z } from 'zod';
import { IMAGE_UPLOAD_CONFIG, MAX_PAGE_SIZE } from '@/lib/constants';

// =================================
// Константы для валидации файлов
// =================================

const MAX_FILE_SIZE = IMAGE_UPLOAD_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024;
const { ACCEPTED_IMAGE_TYPES } = IMAGE_UPLOAD_CONFIG;

// =================================
// Константы для безопасной сортировки
// =================================

/**
 * Whitelist допустимых полей для сортировки (предотвращает атаки через __proto__ и т.д.)
 */
const ALLOWED_SORT_FIELDS = ['name', 'createdAt', 'updatedAt'] as const;

// =================================
// Базовая схема для формы шаблона карты
// =================================

/**
 * @description Схема для валидации формы создания и редактирования шаблона карты.
 * Используется react-hook-form с zodResolver для мгновенной обратной связи на клиенте.
 */
export const mapTemplateFormSchema = z.object({
  name: z
    .string({ required_error: 'Название обязательно для заполнения.' })
    .trim()
    .min(3, 'Название должно содержать минимум 3 символа.')
    .max(50, 'Название не должно превышать 50 символов.'),
  
  description: z
    .string()
    .max(1000, 'Описание не должно превышать 1000 символов.')
    .optional()
    .or(z.literal('')), // Позволяет форме отправлять пустую строку

  // Поле для изображения. Может быть либо уже существующим URL (при редактировании),
  // либо новым файлом (File) при создании/замене.
  image: z
    .any()
    .refine(
      (value) => (typeof value === 'string' && value.length > 0) || (value instanceof File),
      { message: 'Загрузите изображение.' }
    )
    .refine(
      (file) => (file instanceof File ? file.size <= MAX_FILE_SIZE : true),
      `Максимальный размер файла — ${IMAGE_UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB.`
    )
    .refine(
      (file) => (file instanceof File ? ACCEPTED_IMAGE_TYPES.includes(file.type) : true),
      'Поддерживаются только .jpg, .jpeg, .png и .webp форматы.'
    ),
});

/**
 * @description Схема для формы СОЗДАНИЯ шаблона карты.
 * Требует, чтобы изображение было файлом.
 */
export const createMapTemplateFormSchema = mapTemplateFormSchema.extend({
    image: z
    .instanceof(File, { message: 'Загрузите изображение.' })
    .refine(
      (file) => file.size <= MAX_FILE_SIZE,
      `Максимальный размер файла — ${IMAGE_UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB.`
    )
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      'Поддерживаются только .jpg, .jpeg, .png и .webp форматы.'
    ),
});

export type MapTemplateFormValues = z.infer<typeof mapTemplateFormSchema>;

// =================================
// Схемы для API (серверная валидация)
// =================================

/**
 * @desc Схема для создания нового шаблона карты (используется в Server Action).
 */
export const createMapTemplateApiSchema = mapTemplateFormSchema.extend({
  image: z.instanceof(File, { message: 'Для создания требуется файл изображения.' }),
});
export type CreateMapTemplateApiDto = z.infer<typeof createMapTemplateApiSchema>;

/**
 * @desc Схема для обновления шаблона карты (используется в Server Action).
 * Все поля опциональны.
 */
export const updateMapTemplateApiSchema = mapTemplateFormSchema.partial().extend({
  // Убеждаемся, что если изображение передано, оно валидно
  image: mapTemplateFormSchema.shape.image.optional(),
});
export type UpdateMapTemplateApiDto = z.infer<typeof updateMapTemplateApiSchema>;


// =================================
// Схемы для GET-запросов
// =================================

/**
 * @desc Схема для валидации query-параметров при получении списка шаблонов карт.
 * Поддерживает infinite scroll с пагинацией по 50 записей, MeiliSearch поиск и server-side сортировку.
 */
export const getMapTemplatesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE, `Максимальный размер страницы ${MAX_PAGE_SIZE}`).default(50), // ✅ Увеличен лимит для infinite scroll
  q: z.string().optional(),
  status: z.enum(['active', 'archived', 'all']).default('active'),
  sort: z.enum(ALLOWED_SORT_FIELDS).default('createdAt'), // ✅ Безопасный whitelist полей сортировки
  order: z.enum(['asc', 'desc']).default('desc'), // ✅ Направление сортировки (новые сначала по умолчанию)
});

export type GetMapTemplatesDto = z.infer<typeof getMapTemplatesSchema>;