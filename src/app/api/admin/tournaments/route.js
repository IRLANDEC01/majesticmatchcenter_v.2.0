import { NextResponse } from 'next/server';
import { tournamentService } from '@/lib/domain/tournaments/tournament-service.js';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db.js';

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

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = request.body || await request.json();

    const validation = tournamentCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    
    // Используем сервисный слой для создания турнира
    const newTournament = await tournamentService.createTournament(validation.data);

    return NextResponse.json(newTournament, { status: 201 });

  } catch (error) {
    if (error.message.includes('slug-конфликт')) { // Проверяем сообщение об ошибке
      return NextResponse.json({ message: 'Турнир с таким названием уже существует (slug-конфликт).' }, { status: 409 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    await connectToDatabase();
    const query = request.query || Object.fromEntries(new URL(request.url, `http://${request.headers.host}`).searchParams.entries());
    const includeArchived = query.include_archived === 'true';

    const tournaments = await tournamentService.getTournaments({ includeArchived });
    return NextResponse.json(tournaments, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера при получении турниров' }, { status: 500 });
  }
} 