import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Tournament from '@/models/tournament/Tournament';
import { z } from 'zod';
import mongoose from 'mongoose';

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
    const body = await request.json();

    const validation = tournamentCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, template, tournamentType, startDate, participants, description } = validation.data;

    const newTournament = new Tournament({
      name,
      template,
      tournamentType,
      startDate,
      participants,
      description,
    });

    await newTournament.save();

    return NextResponse.json(newTournament, { status: 201 });

  } catch (error) {
    if (error.code === 11000) {
      // Ошибка MongoDB E11000 указывает на нарушение уникального индекса.
      // В нашей схеме это может быть только поле 'slug'.
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
    const tournaments = await Tournament.find({}).sort({ createdAt: -1 });
    return NextResponse.json(tournaments, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера при получении турниров' }, { status: 500 });
  }
} 