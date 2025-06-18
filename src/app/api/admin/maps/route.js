import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/handle-api-error';
import container from '@/lib/di-container';
import { z } from 'zod';

const mapService = container.get('mapService');

const createMapSchema = z.object({
  name: z.string().min(1, 'Название не может быть пустым.'),
  slug: z.string().min(1, 'Slug не может быть пустым.').optional(),
  tournament: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID турнира.'),
  template: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID шаблона.'),
  startDateTime: z.string().datetime({ message: 'Некорректный формат даты и времени.' }),
});

/**
 * GET /api/admin/maps
 * Возвращает список всех карт.
 */
export async function GET() {
  try {
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
    const mapData = await request.json();
    const newMap = await mapService.createMap(mapData);
    return NextResponse.json(newMap, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
} 