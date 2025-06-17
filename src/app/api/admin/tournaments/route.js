import { NextResponse } from 'next/server';
import { tournamentService } from '@/lib/domain/tournaments/tournament-service.js';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db.js';
import { handleApiError } from '@/lib/api/handle-api-error';

// Схема валидации для создания турнира
const tournamentCreateSchema = z.object({
  name: z.string().min(3, 'Название должно содержать минимум 3 символа'),
  description: z.string().optional(),
  template: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Неверный формат ID шаблона',
  }),
  tournamentType: z.enum(['family', 'team']),
  startDate: z.coerce.date(),
  participants: z.array(z.object({
    participantType: z.enum(['family', 'team']),
    family: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: 'Неверный формат ID семьи',
    }).optional(),
    // TODO: Добавить валидацию для 'team' когда будет реализовано
  })).optional(),
});

/**
 * POST /api/admin/tournaments
 * Создает новый турнир.
 */
export async function POST(request) {
  try {
    const data = await request.json();
    const newTournament = await tournamentService.createTournament(data);
    return NextResponse.json(newTournament, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('include_archived') === 'true';

    const tournaments = await tournamentService.getAll({ includeArchived });
    return NextResponse.json(tournaments, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера при получении турниров' }, { status: 500 });
  }
} 