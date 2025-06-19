import { NextResponse } from 'next/server';
import { tournamentService } from '@/lib/domain/tournaments/tournament-service';
import { handleApiError } from '@/lib/api/handle-api-error';

/**
 * @swagger
 * /api/admin/tournaments/{id}/archive:
 *   patch:
 *     summary: Архивировать турнир
 *     description: Устанавливает метку времени в поле `archivedAt` для мягкого удаления турнира.
 *     tags:
 *       - Admin
 *       - Tournaments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID турнира
 *     responses:
 *       204:
 *         description: Турнир успешно архивирован.
 *       404:
 *         description: Турнир не найден.
 *       500:
 *         description: Внутренняя ошибка сервера.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    await tournamentService.archive(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
} 