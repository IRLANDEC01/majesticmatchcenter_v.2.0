import { z } from 'zod';
import { CURRENCY_VALUES, RESULT_TIERS_ENUM } from '@/lib/constants';

/**
 * @desc Zod-схема для одного правила в призовом фонде.
 */
export const prizeRuleSchema = z.object({
  target: z.object({
    tier: z.enum(RESULT_TIERS_ENUM),
    rank: z.number().min(1).optional(),
  }),
  currency: z.enum(CURRENCY_VALUES),
  amount: z.number().min(0),
});

/**
 * @desc Схема для создания нового шаблона турнира.
 */
export const createTournamentTemplateSchema = z.object({
  name: z.string({
    required_error: 'Название обязательно.',
  }).min(3, 'Название должно содержать минимум 3 символа.'),
  
  description: z.string().optional(),
  
  rules: z.string().optional(),

  // Массив ID шаблонов карт. Должен быть массив строк, и он не может быть пустым.
  mapTemplates: z.array(z.string().nonempty('ID шаблона карты не может быть пустым.'))
    .nonempty('Нужно указать хотя бы один шаблон карты.'),
  
  // Призовой фонд. Массив объектов, соответствующих prizeRuleSchema.
  prizePool: z.array(prizeRuleSchema).optional(),
});

/**
 * @desc Схема для обновления существующего шаблона турнира.
 * Все поля опциональны.
 */
export const updateTournamentTemplateSchema = z.object({
  name: z.string().min(3, 'Название должно содержать минимум 3 символа.').optional(),
  description: z.string().optional(),
  rules: z.string().optional(),
  mapTemplates: z.array(z.string().nonempty('ID шаблона карты не может быть пустым.')).nonempty('Нужно указать хотя бы один шаблон карты.').optional(),
  prizePool: z.array(prizeRuleSchema).optional(),
});

/**
 * @desc Схема для валидации query-параметров при получении списка шаблонов турниров.
 */
export const getTournamentTemplatesSchema = z.object({
  search: z.string().optional().default(''),
  status: z.enum(['active', 'archived']).default('active'),
}); 