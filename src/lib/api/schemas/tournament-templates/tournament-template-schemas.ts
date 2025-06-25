import { z } from 'zod';
import { CURRENCY_VALUES, RESULT_TIERS_ENUM } from '@/lib/constants';

// Zod требует непустой массив для enum, а TypeScript не может гарантировать это для
// импорта из JS-файла. Создаем локальные типизированные константы.
const currencyValues: [string, ...string[]] = CURRENCY_VALUES.length > 0
  ? [CURRENCY_VALUES[0], ...CURRENCY_VALUES.slice(1)]
  : (() => { throw new Error('Константа CURRENCY_VALUES не может быть пустой'); })();

const resultTiersEnum: [string, ...string[]] = RESULT_TIERS_ENUM.length > 0
  ? [RESULT_TIERS_ENUM[0], ...RESULT_TIERS_ENUM.slice(1)]
  : (() => { throw new Error('Константа RESULT_TIERS_ENUM не может быть пустой'); })();

// --- Вспомогательные схемы ---

// Валидатор для ObjectId, чтобы избежать ошибок при передаче некорректных строк
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный формат ID');

// Схема для правила награждения, соответствующая новой архитектуре
const prizeRuleSchema = z.object({
  target: z.object({
    tier: z.enum(resultTiersEnum).optional(),
    rank: z.object({
      from: z.number().min(1).optional(),
      to: z.number().min(1).optional(),
    }).optional(),
  }).refine(data => data.tier || data.rank, {
    message: 'В цели (target) должно быть указано хотя бы одно из полей: tier или rank.',
  }),
  reward: z.object({
    amount: z.number().min(0),
    currency: z.enum(currencyValues),
  }).optional(),
  pot: z.object({
    amount: z.number().min(0),
    currency: z.enum(currencyValues),
  }).optional(),
}).refine(data => data.reward || data.pot, {
  message: 'Правило должно содержать либо `reward` (награда), либо `pot` (общий банк).',
});

// --- Основные схемы для DTO ---

const commonNameValidation = z
  .string({ required_error: 'Название обязательно для заполнения.' })
  .min(3, 'Название должно содержать минимум 3 символа.')
  .max(100, 'Название не должно превышать 100 символов.')
  .regex(/^[a-zA-Z0-9 .,!?'"()-]+$/, 'Название может содержать только латинские буквы, цифры и знаки препинания.');

/**
 * Схема для создания нового шаблона турнира.
 * Все поля, необходимые для создания, здесь обязательны.
 */
export const createTournamentTemplateSchema = z.object({
  name: commonNameValidation,
  slug: z.string().regex(/^[a-z0-9-]+$/, { message: 'Slug может содержать только строчные буквы, цифры и дефисы.' }).optional(),
  description: z.string().max(1000, 'Описание не может превышать 1000 символов.').optional(),
  tournamentTemplateImage: z.string().nonempty('URL изображения не может быть пустым.'),
  prizePool: z.array(prizeRuleSchema).optional(),
  mapTemplates: z.array(objectIdSchema).min(1, 'Должен быть выбран хотя бы один шаблон карты.'),
});

/**
 * Схема для обновления существующего шаблона турнира.
 * Все поля опциональны.
 */
export const tournamentTemplateUpdateSchema = z.object({
  name: commonNameValidation.optional(),
  description: z.string().max(1000, 'Описание не может превышать 1000 символов.').optional(),
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, { message: 'Slug может содержать только строчные буквы, цифры и дефисы.' })
    .optional(),
  tournamentTemplateImage: z.string()
    .nonempty('URL изображения не может быть пустым.')
    .optional(),
  prizePool: z.array(prizeRuleSchema)
    .optional(),
  mapTemplates: z.array(objectIdSchema)
    .min(1, 'Должен быть выбран хотя бы один шаблон карты.')
    .optional(),
});

/**
 * Схема для валидации query-параметров при получении списка шаблонов турниров.
 * Обеспечивает безопасную обработку GET-запросов.
 */
export const getTournamentTemplatesSchema = z.object({
  q: z.string().optional(),
  status: z.enum(['active', 'archived', 'all']).default('active'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// --- Вывод типов для использования в коде ---

export type CreateTournamentTemplateDto = z.infer<typeof createTournamentTemplateSchema>;
export type UpdateTournamentTemplateDto = z.infer<typeof tournamentTemplateUpdateSchema>;
export type GetTournamentTemplatesDto = z.infer<typeof getTournamentTemplatesSchema>; 