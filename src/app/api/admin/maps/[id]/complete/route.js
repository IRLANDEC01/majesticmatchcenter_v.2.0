import { NextResponse } from 'next/server';
import { mapService } from '@/lib/domain/maps/map-service';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';

const completeMapSchema = z.object({
  winnerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID победителя.'),
  mvpPlayerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID MVP.'),
  statistics: z.array(z.any()).optional(), // TODO: Уточнить схему статистики
  familyRatingChanges: z.array(z.any()).optional(), // TODO: Уточнить схему
});

/**
 * POST /api/admin/maps/[id]/complete
 * Завершает карту и запускает процесс обновления статистики.
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    await connectToDatabase();
    
    const json = await request.json();
    const validationResult = completeMapSchema.safeParse(json);

    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const updatedMap = await mapService.completeMap(id, validationResult.data);

    if (!updatedMap) {
      return NextResponse.json({ message: 'Карта не найдена или не может быть завершена' }, { status: 404 });
    }

    return NextResponse.json(updatedMap);
  } catch (error) {
    console.error(`Failed to complete map ${params.id}:`, error);
    return NextResponse.json({ message: 'Ошибка сервера при завершении карты' }, { status: 500 });
  }
} 