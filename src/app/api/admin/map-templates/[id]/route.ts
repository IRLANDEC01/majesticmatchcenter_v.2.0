import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/handle-api-error';
import { updateMapTemplateSchema } from '@/lib/api/schemas/map-templates/map-template-schemas';
import mapTemplateService from '@/lib/domain/map-templates/map-template-service';

type RouteContext = {
  params: {
    id: string;
  };
};

/**
 * GET /api/admin/map-templates/{id}
 * Возвращает шаблон карты по ID.
 * @param {Request} request - Объект запроса (не используется).
 * @param {RouteContext} context - Контекст с параметрами маршрута.
 */
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = params;
    const template = await mapTemplateService.getMapTemplateById(id);
    return NextResponse.json(template);
  } catch (error) {
    return handleApiError(error instanceof Error ? error : new Error(String(error)), `Failed to get map template ${params.id}`);
  }
}

/**
 * PATCH /api/admin/map-templates/[id]
 * Обновляет существующий шаблон карты.
 * @param {Request} request - Объект запроса.
 * @param {RouteContext} context - Контекст с параметрами маршрута.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = params;
    const json = await request.json();

    const validationResult = updateMapTemplateSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const updatedTemplate = await mapTemplateService.updateMapTemplate(id, validationResult.data);

    revalidatePath('/admin/map-templates');
    revalidatePath(`/admin/map-templates/${id}/edit`);

    return NextResponse.json(updatedTemplate, { status: 200 });
  } catch (error) {
    return handleApiError(error instanceof Error ? error : new Error(String(error)), `Failed to update map template ${params.id}`);
  }
} 