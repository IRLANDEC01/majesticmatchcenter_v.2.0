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