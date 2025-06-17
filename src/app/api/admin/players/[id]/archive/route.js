import { NextResponse } from 'next/server';
import { playerService } from '@/lib/domain/players/player-service';
import { connectToDatabase } from '@/lib/db';
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
    await connectToDatabase();
    const { id } = params;
    const json = request.body || await request.json();

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
    console.error('Failed to update player archive state:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
} 