import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/handle-api-error';
import { mapTemplateService } from '@/lib/domain/map-templates/map-template-service';

/**
 * PATCH /api/admin/map-templates/[id]/archive
 * Архивирует шаблон карты.
 * @param {Request} request
 * @param {object} context - Контекст запроса, включая параметры.
 * @param {object} context.params - Параметры маршрута.
 * @param {string} context.params.id - ID шаблона.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const archivedTemplate = await mapTemplateService.archiveMapTemplate(id);

    revalidatePath('/admin/map-templates');

    return NextResponse.json(archivedTemplate, { status: 200 });
  } catch (error) {
    return handleApiError(error, `Failed to archive map template ${params.id}`);
  }
}