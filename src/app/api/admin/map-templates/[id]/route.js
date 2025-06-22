import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/handle-api-error';
import { updateMapTemplateSchema } from '@/lib/api/schemas/map-templates/map-template-schemas';

// Import Classes
import MapTemplateService from '@/lib/domain/map-templates/map-template-service';
import MapTemplateRepo from '@/lib/repos/map-templates/map-template-repo';

// Helper function to instantiate the service and its dependencies
function getMapTemplateService() {
  const mapTemplateRepo = new MapTemplateRepo();
  return new MapTemplateService({ mapTemplateRepo });
}

/**
 * GET /api/admin/map-templates/{id}
 * Возвращает шаблон карты по ID.
 * @param {Request} request
 * @param {object} context - Контекст запроса.
 * @param {object} context.params - Параметры маршрута.
 * @param {string} context.params.id - ID шаблона.
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const mapTemplateService = getMapTemplateService();
    const template = await mapTemplateService.getMapTemplateById(id);
    return NextResponse.json(template);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/admin/map-templates/[id]
 * Обновляет существующий шаблон карты.
 * @param {Request} request
 * @param {object} context - Контекст запроса.
 * @param {object} context.params - Параметры маршрута.
 * @param {string} context.params.id - ID шаблона.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const json = await request.json();

    const validationResult = updateMapTemplateSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const mapTemplateService = getMapTemplateService();
    const updatedTemplate = await mapTemplateService.updateMapTemplate(id, validationResult.data);

    revalidatePath('/admin/map-templates');

    return NextResponse.json(updatedTemplate, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
} 