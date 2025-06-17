import { NextResponse } from 'next/server';
import { playerService } from '@/lib/domain/players/player-service';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';

// Zod-схема для создания игрока, более строгая чем модель Mongoose
const createPlayerSchema = z.object({
  firstName: z.string().trim().min(1, 'Имя обязательно.'),
  lastName: z.string().trim().min(1, 'Фамилия обязательна.'),
  bio: z.string().trim().max(5000).optional(),
  avatar: z.string().url('Некорректный URL аватара.').optional(),
});

/**
 * GET /api/admin/players
 * Возвращает всех игроков.
 */
export async function GET() {
  try {
    await connectToDatabase();
    const players = await playerService.getAllPlayers();
    return NextResponse.json(players);
  } catch (error) {
    console.error('Failed to get players:', error);
    return NextResponse.json({ message: 'Ошибка сервера при получении игроков' }, { status: 500 });
  }
}

/**
 * POST /api/admin/players
 * Создает нового игрока.
 */
export async function POST(request) {
  try {
    await connectToDatabase();
    const json = request.body || await request.json();

    const validationResult = createPlayerSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const newPlayer = await playerService.createPlayer(validationResult.data);
    return NextResponse.json(newPlayer, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      // Ошибка дублирующегося ключа (firstName + lastName)
      return NextResponse.json({ message: 'Игрок с таким именем и фамилией уже существует' }, { status: 409 });
    }
    console.error('Failed to create player:', error);
    return NextResponse.json({ message: 'Ошибка сервера при создании игрока' }, { status: 500 });
  }
} 