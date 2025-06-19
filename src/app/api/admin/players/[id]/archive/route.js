import { NextResponse } from 'next/server';
import { playerService } from '@/lib/domain/players/player-service';
import { handleApiError } from '@/lib/api/handle-api-error';
import { z } from 'zod';

const patchSchema = z.object({
  archived: z.boolean(),
});

/**
 * PATCH /api/admin/players/[id]/archive
 * Архивирует или восстанавливает игрока.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const json = await request.json();

    const validationResult = patchSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { archived } = validationResult.data;
    let result;

    if (archived) {
      result = await playerService.archivePlayer(id);
    } else {
      result = await playerService.unarchivePlayer(id);
    }

    if (!result) {
      return NextResponse.json({ message: `Player with id ${id} not found.` }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
} 