import { z } from 'zod';

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const MONGO_ID_ERROR_MSG = 'Некорректный ID.';

/**
 * Схема для валидации ID в параметрах URL.
 */
export const familyParamsSchema = z.object({
  id: z.string().regex(MONGO_ID_REGEX, { message: `${MONGO_ID_ERROR_MSG} (семья)` }),
});

/**
 * Схема для валидации query-параметров при получении списка семей.
 */
export const getFamiliesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(10),
  q: z.string().trim().optional(),
  status: z.enum(['active', 'archived']).optional().default('active'),
});

/**
 * Схема для создания новой семьи.
 */
export const createFamilySchema = z.object({
  name: z.string().trim().min(2, 'Название семьи должно содержать минимум 2 символа.'),
  displayLastName: z.string().trim().min(1, 'Отображаемая фамилия обязательна.'),
  ownerId: z.string().regex(MONGO_ID_REGEX, { message: `${MONGO_ID_ERROR_MSG} (владелец)` }),
  description: z.string().trim().max(5000, 'Описание не может быть длиннее 5000 символов.').optional(),
  logo: z.string().url('Некорректный URL логотипа.').optional().nullable(),
  banner: z.string().url('Некорректный URL баннера.').optional().nullable(),
});

/**
 * Схема для обновления семьи.
 * Почти все поля опциональны.
 */
export const updateFamilySchema = createFamilySchema.omit({ ownerId: true }).partial();

/**
 * Схема для смены владельца семьи.
 */
export const changeOwnerSchema = z.object({
  newOwnerId: z.string().regex(MONGO_ID_REGEX, { message: `${MONGO_ID_ERROR_MSG} (новый владелец)` }),
}); 