import { NextResponse } from 'next/server';
import { playerService } from '@/lib/domain/players/player-service';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';
import mongoose from 'mongoose';
import { handleApiError } from '@/lib/api/handle-api-error';

const MongooseID = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Некорректный ID.',
});

const updatePlayerSchema = z.object({
  firstName: z.string().trim().min(1, 'Имя обязательно.').optional(),
  lastName: z.string().trim().min(1, 'Фамилия обязательна.').optional(),
  bio: z.string().trim().max(5000).optional(),
  avatar: z.string().url('Некорректный URL аватара.').optional(),
  currentFamily: z.string().nullable().optional(), // Может быть ID или null
});

/**
 * GET /api/admin/players/[id]
 * Получает игрока по ID.
 */
export async function GET(request, { params }) {
  try {
    const idValidation = MongooseID.safeParse(params.id);
    if (!idValidation.success) {
      return NextResponse.json({ message: 'Некорректный ID игрока' }, { status: 400 });
    }

    await connectToDatabase();
    const player = await playerService.getPlayerById(params.id);

    if (!player) {
      return NextResponse.json({ message: 'Игрок не найден' }, { status: 404 });
    }
    return NextResponse.json(player);
  } catch (error) {
    console.error(`Failed to get player ${params.id}:`, error);
    return NextResponse.json({ message: 'Ошибка сервера при получении игрока' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/players/[id]
 * Обновляет игрока.
 */
export async function PUT(request, { params }) {
  try {
    const validationResult = updatePlayerSchema.safeParse(await request.json());

    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten() }, { status: 400 });
    }

    const updatedPlayer = await playerService.updatePlayer(params.id, validationResult.data);

    if (!updatedPlayer) {
      return NextResponse.json({ message: 'Игрок не найден' }, { status: 404 });
    }

    return NextResponse.json(updatedPlayer);
  } catch (error) {
    return handleApiError(error);
  }
} 