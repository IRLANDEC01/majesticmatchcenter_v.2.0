import { NextResponse } from 'next/server';
import playerService from '@/lib/domain/players/player-service';
import { handleApiError } from '@/lib/api/handle-api-error';
import { updatePlayerSchema } from '@/lib/api/schemas/players/player-schemas';
import { revalidatePath } from 'next/cache';

/**
 * GET /api/admin/players/[id]
 * Получает игрока по ID.
 */
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const player = await playerService.getPlayerById(id);
    return NextResponse.json(player);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/admin/players/[id]
 * Обновляет игрока.
 */
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const json = await req.json();
    const validatedData = updatePlayerSchema.parse(json);

    const updatedPlayer = await playerService.updatePlayer(id, validatedData);

    revalidatePath('/admin/players');
    revalidatePath(`/admin/players/${id}`);
    if (updatedPlayer.slug) {
      revalidatePath(`/players/${updatedPlayer.slug}`);
    }

    return NextResponse.json(updatedPlayer);
  } catch (error) {
    return handleApiError(error);
  }
} 