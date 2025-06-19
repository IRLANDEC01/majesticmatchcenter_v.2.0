import { z } from 'zod';

const prizeRuleSchema = z.object({
  target: z.object({
    tier: z.string().optional(),
    rank: z.union([z.number(), z.string()]).optional(),
  }),
  currency: z.string(),
  amount: z.number(),
});

/**
 * Схема для создания и обновления шаблона турнира.
 */
export const tournamentTemplateSchema = z.object({
  name: z.string().min(1, 'Название не может быть пустым.'),
  description: z.string().optional(),
  rules: z.string().optional(),
  mapTemplates: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID шаблона карты'))
    .min(1, 'Сценарий должен содержать хотя бы один шаблон карты.'),
  prizePool: z.array(prizeRuleSchema).optional(),
});

/**
 * Схема для создания турнира.
 */
export const createTournamentSchema = z.object({
  name: z.string().min(3, 'Название турнира должно содержать минимум 3 символа.'),
  template: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID шаблона турнира.'),
  tournamentType: z.enum(['family', 'team']),
  participants: z.array(z.object({
    participantType: z.enum(['family', 'team', 'player']),
    family: z.string().optional(),
    player: z.string().optional(),
    team: z.string().optional(),
  })).optional(),
  startDate: z.coerce.date({ required_error: 'Дата начала обязательна.' }),
  endDate: z.coerce.date().optional(),
  description: z.string().optional(),
  prizePool: z.array(prizeRuleSchema).optional(),
  // prizePool, participants и т.д. обычно добавляются после создания,
  // поэтому здесь они не обязательны.
}).refine(data => {
  // Дата окончания не может быть раньше даты начала
  if (data.endDate && data.startDate) {
    return data.endDate >= data.startDate;
  }
  return true;
}, {
  message: 'Дата окончания не может быть раньше даты начала.',
  path: ['endDate'], // Указываем, к какому полю относится ошибка
}); 