import { NextResponse } from 'next/server';
import { mapTemplateService } from '@/lib/domain/map-templates/map-template-service';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';
import { DuplicateError } from '@/lib/errors';

// Поля, которые можно обновлять. Имя делаем опциональным.
const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Название не может быть пустым.').optional(),
  description: z.string().optional(),
  mapImage: z.string().min(1, 'Путь к изображению не может быть пустым.').optional(),
});

/**
 * GET /api/admin/map-templates/{id}
 * Возвращает шаблон карты по ID.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ message: 'Некорректный ID шаблона' }, { status: 400 });
    }

    await connectToDatabase();
    const template = await mapTemplateService.getMapTemplateById(id);

    if (!template || template.archivedAt) {
      return NextResponse.json({ message: 'Шаблон карты не найден' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error(`Failed to get map template ${id}:`, error);
    return NextResponse.json({ message: 'Ошибка сервера при получении шаблона карты' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/map-templates/[id]
 * Обновляет существующий шаблон карты.
 */
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const json = await request.json();

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ message: 'Некорректный ID шаблона' }, { status: 400 });
    }

    const validationResult = updateTemplateSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const updatedTemplate = await mapTemplateService.updateMapTemplate(id, validationResult.data);

    if (!updatedTemplate) {
      return NextResponse.json({ message: 'Шаблон карты не найден' }, { status: 404 });
    }

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    if (error instanceof DuplicateError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    // В логе используем id, если он уже определен
    console.error(`Failed to update map template:`, error);
    return NextResponse.json({ message: 'Ошибка сервера при обновлении шаблона карты' }, { status: 500 });
  }
} 