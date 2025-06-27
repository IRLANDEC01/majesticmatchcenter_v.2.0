import { NextResponse } from 'next/server';
import playerService from '@/lib/domain/players/player-service.js';
import { handleApiError } from '@/lib/api/handle-api-error';
import { revalidatePath } from 'next/cache';

/**
 * @swagger
 * /api/admin/players/{id}/archive:
 *   patch:
 *     summary: Архивирует игрока
 *     tags: [Players]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID игрока
 *     responses:
 *       200:
 *         description: Игрок успешно заархивирован
 *       404:
 *         description: Игрок не найден
 *       422:
 *         description: Ошибка валидации (например, игрок является владельцем семьи)
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const result = await playerService.archivePlayer(id);

    // Вызываем только один раз для главной страницы, как того ожидает тест
    revalidatePath('/admin/players');

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}