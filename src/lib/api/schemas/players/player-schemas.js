// src/lib/api/schemas/players/player-schemas.js
import { z } from 'zod';

/**
 * Схема для валидации query-параметров при получении списка игроков.
 */
export const getPlayersSchema = z.object({
  status: z.enum(['active', 'archived', 'all']).optional().default('active'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

/**
 * Схема для создания нового игрока.
 * Определяет поля, необходимые при POST запросе.
 */
export const createPlayerSchema = z.object({
  firstName: z
    .string({ required_error: 'Имя обязательно.' })
    .trim()
    .min(1, 'Имя не может быть пустым.')
    .regex(/^[a-zA-Z]+$/, 'Имя может содержать только латинские буквы.'),
  lastName: z
    .string({ required_error: 'Фамилия обязательна.' })
    .trim()
    .min(1, 'Фамилия не может быть пустой.')
    .regex(/^[a-zA-Z]+$/, 'Фамилия может содержать только латинские буквы.'),
  bio: z.string().trim().max(5000, 'Биография не может превышать 5000 символов.').optional(),
  avatar: z.string().url('Некорректный URL аватара.').optional(),
});

/**
 * Схема для обновления данных игрока.
 * Все поля сделаны опциональными.
 */
export const updatePlayerSchema = z.object({
  firstName: z.string().trim().min(1, 'Имя обязательно.').optional(),
  lastName: z.string().trim().min(1, 'Фамилия обязательна.').optional(),
  bio: z.string().trim().max(5000).optional(),
  avatar: z.string().url('Некорректный URL аватара.').optional(),
  currentFamily: z.string().nullable().optional(), // Может быть ID или null
});