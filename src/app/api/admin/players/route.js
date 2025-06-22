import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/handle-api-error';
import playerService from '@/lib/domain/players/player-service';
import { createPlayerSchema, getPlayersSchema } from '@/lib/api/schemas/players/player-schemas';
import { revalidatePath } from 'next/cache';

/**
 * @swagger
 * /api/admin/players:
 *   get:
 *     summary: Получает список игроков
 *     tags: [Players]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, archived, all]
 *         description: Фильтр по статусу игроков
 *     responses:
 *       200:
 *         description: Список игроков
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Player'
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Валидация query-параметров
    const validatedQuery = getPlayersSchema.parse(queryParams);

    const result = await playerService.getPlayers(validatedQuery);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * @swagger
 * /api/admin/players:
 *   post:
 *     summary: Создает нового игрока
 *     tags: [Players]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePlayer'
 *     responses:
 *       201:
 *         description: Игрок успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Player'
 *       400:
 *         description: Ошибка валидации
 *       409:
 *         description: Игрок уже существует
 */
export async function POST(request) {
  try {
    const jsonBody = await request.json();
    const validatedData = createPlayerSchema.parse(jsonBody);
    const newPlayer = await playerService.createPlayer(validatedData);

    revalidatePath('/admin/players');

    return NextResponse.json(newPlayer, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}