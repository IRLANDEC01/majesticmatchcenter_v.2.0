import { NextResponse } from 'next/server';
import { playerService } from '@/lib/domain/players/player-service';
import { connectToDatabase } from '@/lib/db';
import { handleApiError } from '@/lib/api/handle-api-error';
import { updatePlayerSchema } from '@/lib/api/schemas/players/player-schemas';

/**
 * GET /api/admin/players/[id]
 * Получает игрока по ID.
 */
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    // Валидация ID делегируется в сервис или repo,
    // а CastError будет пойман в handleApiError
    const player = await playerService.getPlayerById(params.id);
    return NextResponse.json(player);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/players/[id]
 * Обновляет игрока.
 */
export async function PUT(request, { params }) {
  try {
    await connectToDatabase();
    const json = await request.json();
    const validatedData = updatePlayerSchema.parse(json);

    const updatedPlayer = await playerService.updatePlayer(params.id, validatedData);
    return NextResponse.json(updatedPlayer);
  } catch (error) {
    return handleApiError(error);
  }
} 