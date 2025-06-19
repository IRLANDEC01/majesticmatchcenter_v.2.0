import { z } from 'zod';

/**
 * Схема для валидации query-параметров при получении списка семей.
 */
export const getFamiliesSchema = z.object({
  include_archived: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional()
    .default('false'),
});

/**
 * Схема для создания новой семьи.
 */
export const createFamilySchema = z.object({
  name: z.string().trim().min(3, 'Название семьи должно содержать минимум 3 символа.'),
  displayLastName: z.string().trim().min(1, 'Отображаемая фамилия обязательна.'),
  ownerId: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: 'Некорректный ID владельца.',
  }),
  description: z.string().trim().max(5000).optional(),
  logo: z.string().url('Некорректный URL логотипа.').optional().nullable(),
  banner: z.string().url('Некорректный URL баннера.').optional().nullable(),
});

/**
 * Схема для обновления семьи.
 * Все поля опциональны, так как можно обновлять только часть данных.
 */
export const updateFamilySchema = createFamilySchema.partial(); 