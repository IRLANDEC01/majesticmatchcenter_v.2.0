import { NextResponse } from 'next/server';
import { mapRepo } from '@/lib/repos/maps/map-repo';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';
import Map from '@/models/map/Map';

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
    await connectToDatabase();
    const maps = await mapRepo.getAll();
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
    const json = await request.json();

    const validationResult = createMapSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const newMap = new Map(validationResult.data);
    await newMap.save();
    
    return NextResponse.json(newMap.toObject(), { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Карта с таким slug уже существует' }, { status: 409 });
    }
    console.error('Failed to create map:', error);
    return NextResponse.json({ message: 'Ошибка сервера при создании карты' }, { status: 500 });
  }
} 