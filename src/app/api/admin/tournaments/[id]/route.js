import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Tournament from '@/models/tournament/Tournament';
import mongoose from 'mongoose';
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

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Неверный формат ID' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return NextResponse.json({ message: 'Турнир не найден' }, { status: 404 });
    }

    return NextResponse.json(tournament, { status: 200 });
  } catch (error) {
    console.error('Ошибка при получении турнира:', error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Неверный формат ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validatedData = tournamentUpdateSchema.parse(body);
    
    await connectToDatabase();

    const updatedTournament = await Tournament.findByIdAndUpdate(
      id,
      validatedData,
      { new: true, runValidators: true } // new: true возвращает обновленный документ, runValidators: true заставляет Mongoose запустить валидаторы схемы
    );

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

export async function DELETE(request, { params }) {
  const { id } = params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Неверный формат ID' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const deletedTournament = await Tournament.findByIdAndDelete(id);

    if (!deletedTournament) {
      return NextResponse.json({ message: 'Турнир не найден' }, { status: 404 });
    }

    return new Response(null, { status: 204 }); // 204 No Content
  } catch (error) {
    console.error('Ошибка при удалении турнира:', error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
} 