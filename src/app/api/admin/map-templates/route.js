import { NextResponse } from 'next/server';
import { mapTemplateService } from '@/lib/domain/map-templates/map-template-service';
import { connectToDatabase } from '@/lib/db';
import { createMapTemplateSchema } from '@/lib/api/schemas/map-templates/map-template-schemas';
import { DuplicateError } from '@/lib/errors';
import mapTemplateRepo from '@/lib/repos/map-templates/map-template-repo';
import { handleApiError } from '@/lib/api/handle-api-error';

/**
 * Обработчик GET-запроса для получения шаблонов карт.
 * Поддерживает фильтрацию по ID, поиск по имени и включение архивных записей.
 * @param {Request} request - Входящий запрос.
 * @returns {Promise<NextResponse>}
 */
export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const includeArchived = searchParams.get('include_archived') === 'true';

    const templates = await mapTemplateRepo.findAll({
      id,
      search,
      includeArchived,
    });

    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Обработчик POST-запроса для создания нового шаблона карты.
 * @param {Request} request - Входящий запрос.
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  try {
    await connectToDatabase();
    const json = await request.json();

    const validationResult = createMapTemplateSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const newTemplate = await mapTemplateService.createMapTemplate(validationResult.data);
    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (error.code === 11000) {
      // MongoDB duplicate key error - a fallback
      return NextResponse.json({ message: 'Шаблон карты с таким названием уже существует' }, { status: 409 });
    }
    console.error('Failed to create map template:', error);
    return NextResponse.json({ message: 'Ошибка сервера при создании шаблона карты' }, { status: 500 });
  }
} 