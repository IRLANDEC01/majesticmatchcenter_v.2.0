import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/handle-api-error';
import container from '@/lib/di-container';
import { z } from 'zod';
import { NotFoundError } from '@/lib/errors';

const mapService = container.get('mapService');

// Схема для обновления. Все поля опциональны.
const updateMapSchema = z.object({
  name: z.string().min(1, 'Название не может быть пустым.').optional(),
  slug: z.string().min(1, 'Slug не может быть пустым.').optional(),
  description: z.string().optional(),
  template: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID шаблона.').optional(),
  startDateTime: z.string().datetime({ message: 'Некорректный формат даты и времени.' }).optional(),
});

// Схема для PATCH запроса (архивация/восстановление)
const patchMapSchema = z.object({
  archived: z.boolean(),
});

/**
 * GET /api/admin/maps/[id]
 * Возвращает карту по ID.
 */
export async function GET(request, { params }) {
  try {
    const map = await mapService.getMapById(params.id);
    if (!map) {
      return NextResponse.json({ message: 'Карта не найдена' }, { status: 404 });
    }
    return NextResponse.json(map);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/maps/[id]
 * Обновляет существующую карту.
 */
export async function PUT(request, { params }) {
  try {
    const mapData = await request.json();
    const updatedMap = await mapService.updateMap(params.id, mapData);
    if (!updatedMap) {
      return NextResponse.json({ message: 'Карта не найдена' }, { status: 404 });
    }
    return NextResponse.json(updatedMap);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/admin/maps/[id]
 * Архивирует или восстанавливает карту.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ message: 'Некорректный ID карты' }, { status: 400 });
    }

    await connectToDatabase();
    const json = await request.json();

    const validationResult = patchMapSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { archived } = validationResult.data;
    let result;

    if (archived) {
      result = await mapService.archiveMap(id);
    } else {
      result = await mapService.unarchiveMap(id);
    }

    if (!result) {
      return NextResponse.json({ message: 'Карта не найдена' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`Failed to update map status ${params.id}:`, error);
    return NextResponse.json({ message: 'Ошибка сервера при изменении статуса карты' }, { status: 500 });
  }
} 