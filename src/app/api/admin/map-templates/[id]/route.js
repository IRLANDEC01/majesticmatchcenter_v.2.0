import { NextResponse } from 'next/server';
import { mapTemplateService } from '@/lib/domain/map-templates/map-template-service';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';

// Поля, которые можно обновлять. Имя делаем опциональным.
const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Название не может быть пустым.').optional(),
  description: z.string().optional(),
  mapImage: z.string().url('Некорректный URL изображения.').optional(),
});

/**
 * PUT /api/admin/map-templates/[id]
 * Обновляет существующий шаблон карты.
 */
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ message: 'Некорректный ID шаблона' }, { status: 400 });
    }

    await connectToDatabase();
    const json = await request.json();

    const validationResult = updateTemplateSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const updatedTemplate = await mapTemplateService.updateTemplate(id, validationResult.data);

    if (!updatedTemplate) {
      return NextResponse.json({ message: 'Шаблон карты не найден' }, { status: 404 });
    }

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error(`Failed to update map template ${params.id}:`, error);
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Шаблон карты с таким названием уже существует' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Ошибка сервера при обновлении шаблона карты' }, { status: 500 });
  }
} 