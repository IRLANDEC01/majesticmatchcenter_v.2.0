import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/handle-api-error';
import { tournamentService } from '@/lib/domain/tournaments/tournament-service';

const completeSchema = z.object({
  winnerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID победителя.').optional(),
});

/**
 * POST /api/admin/tournaments/{id}/complete
 * Завершает турнир, определяет победителя и начисляет призы.
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const json = await request.json();
    
    const validationResult = completeSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const updatedTournament = await tournamentService.completeTournament(id, validationResult.data);

    return NextResponse.json(updatedTournament, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
} 