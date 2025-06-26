import { NextRequest, NextResponse } from 'next/server';
import mapTemplateService from '@/lib/domain/map-templates/map-template-service';
import { handleApiError } from '@/lib/api/handle-api-error';
import {
  UpdateMapTemplateDto,
  updateMapTemplateSchema,
} from '@/lib/api/schemas/map-templates/map-template-schemas';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

/**
 * GET /api/admin/map-templates/{id}
 * Возвращает шаблон карты по ID.
 * @param {Request} request - Объект запроса (не используется).
 * @param {RouteContext} context - Контекст с параметрами маршрута.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const mapTemplate = await mapTemplateService.getMapTemplateById(params.id);
    return NextResponse.json({ data: mapTemplate });
  } catch (error) {
    return handleApiError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * PATCH /api/admin/map-templates/[id]
 * Обновляет существующий шаблон карты.
 * @param {Request} request - Объект запроса.
 * @param {RouteContext} context - Контекст с параметрами маршрута.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const data: UpdateMapTemplateDto = updateMapTemplateSchema.parse(body);
    const updatedTemplate = await mapTemplateService.updateMapTemplate(params.id, data);

    revalidatePath('/admin/map-templates');
    revalidatePath(`/admin/map-templates/${params.id}`);

    return NextResponse.json({ data: updatedTemplate });
  } catch (error) {
    return handleApiError(error instanceof Error ? error : new Error(String(error)));
  }
} 