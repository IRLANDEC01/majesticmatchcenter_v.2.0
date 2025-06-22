import { z } from 'zod';

/**
 * Схема для создания новой карты.
 * Является единым источником правды для API и сервисного слоя.
 */
export const createMapSchema = z.object({
  name: z.string().trim().min(1, 'Название карты обязательно.'),
  tournament: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID турнира.'),
  template: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID шаблона.'),
  startDateTime: z.coerce.date({ required_error: 'Дата и время начала обязательны.' }),
});

/**
 * Схема для обновления существующей карты.
 * Partial, так как любое поле может быть обновлено независимо.
 */
export const updateMapSchema = createMapSchema.partial();

/**
 * Схема для валидации данных при завершении карты.
 */
export const completeMapSchema = z.object({
  winnerFamilyId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID семьи-победителя.'),
  mvpPlayerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID MVP.'),
  familyRatingChange: z.number().nonnegative('Рейтинг не может быть отрицательным.'),
  familyResults: z.array(z.object({
    familyId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    points: z.number().nonnegative('Турнирные очки не могут быть отрицательными.'),
  })).optional(),
  playerStats: z.array(z.object({
    playerId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }).passthrough()),
}); 