import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/handle-api-error';
import mapTemplateService from '@/lib/domain/map-templates/map-template-service';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * PATCH /api/admin/map-templates/[id]/restore
 * Восстанавливает шаблон карты из архива.
 * @param {Request} request - Объект запроса (не используется, но обязателен).
 * @param {RouteContext} context - Контекст запроса с параметрами маршрута.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  
  try {
    const restoredTemplate = await mapTemplateService.restoreMapTemplate(id);

    revalidatePath('/admin/map-templates');
    revalidatePath(`/admin/map-templates/${id}`);

    return NextResponse.json(restoredTemplate, { status: 200 });
  } catch (error) {
    return handleApiError(error instanceof Error ? error : new Error(String(error)), `Failed to restore map template ${id}`);
  }
} 