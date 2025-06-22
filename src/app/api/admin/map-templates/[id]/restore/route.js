import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/handle-api-error';
import { mapTemplateService } from '@/lib/domain/map-templates/map-template-service';

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
    const restoredTemplate = await mapTemplateService.restoreMapTemplate(id);

    revalidatePath('/admin/map-templates');

    return NextResponse.json(restoredTemplate, { status: 200 });
  } catch (error) {
    return handleApiError(error, `Failed to restore map template ${params.id}`);
  }
} 