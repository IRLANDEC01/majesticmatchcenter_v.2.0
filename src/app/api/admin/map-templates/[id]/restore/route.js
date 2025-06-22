import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/handle-api-error';

// Import Classes
import MapTemplateService from '@/lib/domain/map-templates/map-template-service';
import MapTemplateRepo from '@/lib/repos/map-templates/map-template-repo';

// Helper function to instantiate the service and its dependencies
function getMapTemplateService() {
  const mapTemplateRepo = new MapTemplateRepo();
  return new MapTemplateService({ mapTemplateRepo });
}

/**
 * PATCH /api/admin/map-templates/[id]/restore
 * Восстанавливает шаблон карты из архива.
 * @param {Request} request
 * @param {object} context - Контекст запроса, включая параметры.
 * @param {object} context.params - Параметры маршрута.
 * @param {string} context.params.id - ID шаблона.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const mapTemplateService = getMapTemplateService();
    const restoredTemplate = await mapTemplateService.restoreMapTemplate(id);

    revalidatePath('/admin/map-templates');

    return NextResponse.json(restoredTemplate, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
} 