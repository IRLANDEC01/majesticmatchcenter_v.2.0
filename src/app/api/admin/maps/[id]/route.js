import { NextResponse } from 'next/server';
import { mapRepo } from '@/lib/repos/maps/map-repo';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';
import Map from '@/models/map/Map';

// Схема для обновления. Все поля опциональны.
const updateMapSchema = z.object({
  name: z.string().min(1, 'Название не может быть пустым.').optional(),
  slug: z.string().min(1, 'Slug не может быть пустым.').optional(),
  description: z.string().optional(),
  template: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID шаблона.').optional(),
  startDateTime: z.string().datetime({ message: 'Некорректный формат даты и времени.' }).optional(),
});

/**
 * GET /api/admin/maps/[id]
 * Возвращает карту по ID.
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ message: 'Некорректный ID карты' }, { status: 400 });
    }

    await connectToDatabase();
    const map = await mapRepo.findById(id);

    if (!map) {
      return NextResponse.json({ message: 'Карта не найдена' }, { status: 404 });
    }

    return NextResponse.json(map);
  } catch (error) {
    console.error(`Failed to get map ${params.id}:`, error);
    return NextResponse.json({ message: 'Ошибка сервера при получении карты' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/maps/[id]
 * Обновляет существующую карту.
 */
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ message: 'Некорректный ID карты' }, { status: 400 });
    }

    await connectToDatabase();
    const json = await request.json();

    const validationResult = updateMapSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const updatedMap = await Map.findByIdAndUpdate(id, validationResult.data, { new: true, runValidators: true }).lean();

    if (!updatedMap) {
      return NextResponse.json({ message: 'Карта не найдена' }, { status: 404 });
    }

    return NextResponse.json(updatedMap);
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Карта с таким slug уже существует' }, { status: 409 });
    }
    console.error(`Failed to update map ${params.id}:`, error);
    return NextResponse.json({ message: 'Ошибка сервера при обновлении карты' }, { status: 500 });
  }
} 