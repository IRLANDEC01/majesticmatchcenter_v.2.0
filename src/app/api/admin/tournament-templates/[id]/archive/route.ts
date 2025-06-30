import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/handle-api-error';
import tournamentTemplateService from '@/lib/domain/tournament-templates/tournament-template-service';
import type { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';

/**
 * @swagger
 * /api/admin/tournament-templates/{id}/archive:
 *   patch:
 *     summary: Archives a tournament template
 *     tags: [Tournament Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the tournament template to archive.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tournament template archived successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tournament template archived
 *       404:
 *         description: Tournament template not found.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    await tournamentTemplateService.archiveTournamentTemplate(params.id);
    return NextResponse.json({ message: 'Tournament template archived' });
  } catch (error) {
    if (error instanceof Error) {
      return handleApiError(error);
    }
    return handleApiError(new Error('An unknown error occurred during archiving'));
  }
} 