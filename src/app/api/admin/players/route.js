import { NextResponse } from 'next/server';
import { playerService } from '@/lib/domain/players/player-service';
import { connectToDatabase } from '@/lib/db';
import { handleApiError } from '@/lib/api/handle-api-error';
import {
  createPlayerSchema,
  getPlayersSchema,
} from '@/lib/api/schemas/players/player-schemas';

/**
 * GET /api/admin/players
 * Возвращает всех игроков.
 */
export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const { include_archived } = getPlayersSchema.parse(queryParams);

    const players = await playerService.getAllPlayers({ includeArchived: include_archived });
    return NextResponse.json(players);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/players
 * Создает нового игрока.
 */
export async function POST(request) {
  try {
    await connectToDatabase();
    const json = await request.json();
    const validatedData = createPlayerSchema.parse(json);

    const newPlayer = await playerService.createPlayer(validatedData);
    return NextResponse.json(newPlayer, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
} 