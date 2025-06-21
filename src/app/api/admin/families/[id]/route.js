import { NextResponse } from 'next/server';
import { familyService } from '@/lib/domain/families/family-service';
import { handleApiError } from '@/lib/api/handle-api-error';
import { updateFamilySchema, familyIdSchema } from '@/lib/api/schemas/families/family-schemas';

/**
 * GET /api/admin/families/[id]
 * Получает семью по ID.
 */
export async function GET(request, { params }) {
  try {
    const { id } = familyIdSchema.parse(params);
    const family = await familyService.getFamilyById(id);
    return NextResponse.json(family);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/families/[id]
 * Обновляет семью.
 */
export async function PUT(request, { params }) {
  try {
    const { id } = familyIdSchema.parse(params);
    const body = await request.json();
    const validatedData = updateFamilySchema.parse(body);

    const updatedFamily = await familyService.updateFamily(id, validatedData);
    return NextResponse.json(updatedFamily);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Удаление семьи (мягкое удаление).
 * @param {Request} request
 * @param {object} context - Контекст с параметрами маршрута.
 * @param {string} context.params.id - ID семьи.
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = familyIdSchema.parse(params);
    await familyService.archiveFamily(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
} 