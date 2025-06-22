import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/handle-api-error';
import {
  createMapTemplateSchema,
  getMapTemplatesSchema,
} from '@/lib/api/schemas/map-templates/map-template-schemas';
import mapTemplateService from '@/lib/domain/map-templates/map-template-service';

/**
 * Обработчик GET-запроса для получения шаблонов карт.
 * @param {Request} request - Входящий запрос.
 * @returns {Promise<NextResponse>}
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const validationResult = getMapTemplatesSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const templates = await mapTemplateService.getAllMapTemplates(validationResult.data);

    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Failed to get map templates');
  }
}

/**
 * Обработчик POST-запроса для создания нового шаблона карты.
 * @param {Request} request - Входящий запрос.
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  try {
    const json = await request.json();

    const validationResult = createMapTemplateSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const newTemplate = await mapTemplateService.createMapTemplate(validationResult.data);

    revalidatePath('/admin/map-templates');

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create map template');
  }
}