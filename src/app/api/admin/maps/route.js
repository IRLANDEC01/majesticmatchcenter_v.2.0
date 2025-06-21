import { NextResponse } from 'next/server';
import { mapService } from '@/lib/domain/maps/map-service';
import { connectToDatabase } from '@/lib/db';
import { createMapSchema } from '@/lib/api/schemas/maps/map-schemas';
import { handleApiError } from '@/lib/api/handle-api-error';

/**
 * GET /api/admin/maps
 * Возвращает список всех карт.
 */
export async function GET() {
  try {
    await connectToDatabase();
    const maps = await mapService.getAllMaps();
    return NextResponse.json(maps);
  } catch (error) {
    console.error('Failed to get maps:', error);
    return NextResponse.json({ message: 'Ошибка сервера при получении карт' }, { status: 500 });
  }
}

/**
 * POST /api/admin/maps
 * Создает новую карту.
 */
export async function POST(request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    const validation = createMapSchema.safeParse(data);
    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const newMap = await mapService.createMap(validation.data);
    return NextResponse.json(newMap, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
} 