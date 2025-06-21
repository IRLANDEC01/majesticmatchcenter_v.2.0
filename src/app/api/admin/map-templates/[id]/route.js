import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { mapTemplateService } from '@/lib/domain/map-templates/map-template-service';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';
import { DuplicateError, NotFoundError } from '@/lib/errors';
import { updateMapTemplateSchema } from '@/lib/api/schemas/map-templates/map-template-schemas';
import { handleApiError } from '@/lib/api/handle-api-error';

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
    await connectToDatabase();
    const template = await mapTemplateService.getMapTemplateById(id);
    if (!template) {
      return NextResponse.json({ message: 'Шаблон карты не найден' }, { status: 404 });
    }
    return NextResponse.json(template);
  } catch (error) {
    return handleApiError(error);
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

    // После успешного обновления инвалидируем кэш страницы со списком
    revalidatePath('/admin/map-templates');

    return NextResponse.json(updatedTemplate, { status: 200 });
  } catch (error) {
    if (error instanceof DuplicateError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    // В логе используем id, если он уже определен
    console.error(`Failed to update map template:`, error);
    return NextResponse.json({ message: 'Ошибка сервера при обновлении шаблона карты' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const json = await request.json();

    const validationResult = updateMapTemplateSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const updatedTemplate = await mapTemplateService.updateMapTemplate(id, validationResult.data);

    // После успешного обновления инвалидируем кэш страницы со списком
    revalidatePath('/admin/map-templates');

    return NextResponse.json(updatedTemplate, { status: 200 });
  } catch (error) {
    if (error instanceof DuplicateError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    return handleApiError(error);
  }
} 