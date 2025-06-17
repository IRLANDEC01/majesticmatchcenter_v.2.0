import { NextResponse } from 'next/server';
import { mapService } from '@/lib/domain/maps/map-service';
import { connectToDatabase } from '@/lib/db';

/**
 * POST /api/admin/maps/[id]/rollback
 * Откатывает результаты карты к статусу 'active'.
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    await connectToDatabase();
    
    const rolledBackMap = await mapService.rollbackMapCompletion(id);

    if (!rolledBackMap) {
      return NextResponse.json({ message: 'Карта не найдена или ее результаты не могут быть отменены' }, { status: 404 });
    }

    return NextResponse.json(rolledBackMap);
  } catch (error) {
    console.error(`Failed to rollback map ${params.id}:`, error);
    return NextResponse.json({ message: 'Ошибка сервера при откате результатов карты' }, { status: 500 });
  }
} 