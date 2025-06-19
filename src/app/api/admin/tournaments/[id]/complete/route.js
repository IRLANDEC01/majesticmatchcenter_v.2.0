import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/handle-api-error';
import { tournamentService } from '@/lib/domain/tournaments/tournament-service';
import { RESULT_TIERS_ENUM } from '@/lib/constants';

const outcomesSchema = z.array(z.object({
  familyId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID семьи.'),
  tier: z.enum(RESULT_TIERS_ENUM),
  rank: z.number().min(1).optional(),
})).min(1, 'Массив результатов (outcomes) не может быть пустым.');

const completePayloadSchema = z.object({
  outcomes: outcomesSchema,
});

/**
 * PATCH /api/admin/tournaments/{id}/complete
 * Завершает турнир, используя предоставленные результаты (outcomes),
 * распределяет призы и обновляет статистику.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const payload = await request.json();
    
    const validationResult = completePayloadSchema.safeParse(payload);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const updatedTournament = await tournamentService.completeTournament(id, validationResult.data);

    return NextResponse.json(updatedTournament, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
} 