import { NextResponse } from 'next/server';
import { tournamentService } from '@/lib/domain/tournaments/tournament-service.js';
import { z } from 'zod';

const tournamentUpdateSchema = z.object({
  name: z.string().min(3, 'Название должно содержать минимум 3 символа').optional(),
  description: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  // Добавьте другие поля, которые можно обновлять
}).strict(); // Запрещаем передавать поля, не описанные в схеме

export async function GET(request, { params }) {
  const { id } = params;

  try {
    const tournament = await tournamentService.getTournamentById(id);

    if (!tournament) {
      return NextResponse.json({ message: 'Турнир не найден' }, { status: 404 });
    }

    return NextResponse.json(tournament, { status: 200 });
  } catch (error) {
    // Basic error handling, can be improved with a logger and specific error types
    console.error(`Ошибка при получении турнира ${id}:`, error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = params;

  try {
    const body = await request.json();
    const validatedData = tournamentUpdateSchema.parse(body);
    
    const updatedTournament = await tournamentService.updateTournament(id, validatedData);

    if (!updatedTournament) {
      return NextResponse.json({ message: 'Турнир не найден' }, { status: 404 });
    }

    return NextResponse.json(updatedTournament, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error('Ошибка при обновлении турнира:', error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
} 