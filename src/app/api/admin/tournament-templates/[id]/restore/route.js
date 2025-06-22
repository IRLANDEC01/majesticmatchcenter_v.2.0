import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/handle-api-error';
import { revalidatePath } from 'next/cache';
import tournamentTemplateService from '@/lib/domain/tournament-templates/tournament-template-service';

/**
 * @swagger
 * /api/admin/tournament-templates/{id}/restore:
 *   patch:
 *     summary: Восстанавливает шаблон турнира из архива
 *     tags: [TournamentTemplates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID шаблона турнира
 *     responses:
 *       200:
 *         description: Шаблон турнира успешно восстановлен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TournamentTemplate'
 *       404:
 *         description: Шаблон турнира не найден
 */
export async function PATCH(request, { params }) {
  try {
    const restoredTemplate = await tournamentTemplateService.restoreTemplate(params.id);
    
    revalidatePath('/admin/tournament-templates');
    
    return NextResponse.json(restoredTemplate);
  } catch (error) {
    return handleApiError(error, 'восстановить шаблон турнира');
  }
} 