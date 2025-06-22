import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/handle-api-error';
import {
  createMapTemplateSchema,
  getMapTemplatesSchema,
} from '@/lib/api/schemas/map-templates/map-template-schemas';

// Import Classes
import MapTemplateService from '@/lib/domain/map-templates/map-template-service';
import MapTemplateRepo from '@/lib/repos/map-templates/map-template-repo';

// Helper function to instantiate the service and its dependencies
function getMapTemplateService() {
  const mapTemplateRepo = new MapTemplateRepo();
  return new MapTemplateService({ mapTemplateRepo });
}

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

    const mapTemplateService = getMapTemplateService();
    const templates = await mapTemplateService.getAllMapTemplates(validationResult.data);

    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    console.error('ERROR in GET /api/admin/map-templates:', error);
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
    const json = await request.json();

    const validationResult = createMapTemplateSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const mapTemplateService = getMapTemplateService();
    const newTemplate = await mapTemplateService.createMapTemplate(validationResult.data);

    // После успешного создания инвалидируем кэш страницы со списком
    revalidatePath('/admin/map-templates');

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    console.error('ERROR in POST /api/admin/map-templates:', error);
    return handleApiError(error);
  }
}