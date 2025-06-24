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

/**
 * Схема для создания нового шаблона турнира.
 * Все поля, необходимые для создания, здесь обязательны.
 */
export const createTournamentTemplateSchema = z.object({
  name: z.string().min(3, 'Название должно содержать минимум 3 символа.'),
  slug: z.string().regex(/^[a-z0-9-]+$/, { message: 'Slug может содержать только строчные буквы, цифры и дефисы.' }).optional(),
  description: z.string().max(1000, 'Описание не может превышать 1000 символов.').optional(),
  tournamentTemplateImage: z.string().url('URL изображения должен быть корректным.'),
  prizePool: z.array(prizeRuleSchema).optional(),
  mapTemplates: z.array(objectIdSchema).min(1, 'Должен быть выбран хотя бы один шаблон карты.'),
});

/**
 * Схема для обновления существующего шаблона турнира.
 * Все поля здесь опциональны, так как можно обновлять только часть данных.
 */
export const updateTournamentTemplateSchema = createTournamentTemplateSchema.partial().extend({
  // Уточняем правило для mapTemplates при обновлении:
  // Поле можно не передавать, но если оно есть, оно не может быть пустым.
  mapTemplates: z.array(objectIdSchema).min(1, 'Должен быть выбран хотя бы один шаблон карты.').optional(),
});

// --- Вывод типов для использования в коде ---

export type CreateTournamentTemplateDto = z.infer<typeof createTournamentTemplateSchema>;
export type UpdateTournamentTemplateDto = z.infer<typeof updateTournamentTemplateSchema>; 