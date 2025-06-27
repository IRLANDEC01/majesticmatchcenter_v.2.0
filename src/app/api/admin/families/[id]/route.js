import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import familyService from '@/lib/domain/families/family-service.js';
import { handleApiError } from '@/lib/api/handle-api-error.js';
import { updateFamilySchema, familyParamsSchema } from '@/lib/api/schemas/families/family-schemas.js';

/**
 * GET /api/admin/families/[id]
 * Получает семью по ID.
 */
export async function GET(request, { params }) {
  try {
    const awaitedParams = await params;
    const { id } = familyParamsSchema.parse(awaitedParams);
    const family = await familyService.getFamilyById(id);
    return NextResponse.json(family);
  } catch (error) {
    const { id } = await params;
    return handleApiError(error, `Не удалось получить семью ${id}`);
  }
}

/**
 * PUT /api/admin/families/[id]
 * Обновляет семью.
 */
export async function PUT(request, { params }) {
  try {
    const awaitedParams = await params;
    const { id } = familyParamsSchema.parse(awaitedParams);
    const body = await request.json();
    const validatedData = updateFamilySchema.parse(body);

    const updatedFamily = await familyService.updateFamily(id, validatedData);
    
    revalidatePath('/admin/families');
    revalidatePath(`/admin/families/${id}`);
    
    return NextResponse.json(updatedFamily);
  } catch (error) {
    const { id } = await params;
    return handleApiError(error, `Не удалось обновить семью ${id}`);
  }
}

/**
 * Удаление семьи (мягкое удаление).
 * Этот метод больше не используется, заменен на PATCH /archive.
 * Оставлен для обратной совместимости, если где-то вызывается.
 * @deprecated
 */
export async function DELETE(request, { params }) {
  try {
    const awaitedParams = await params;
    const { id } = familyParamsSchema.parse(awaitedParams);
    await familyService.archiveFamily(id);

    revalidatePath('/admin/families');
    revalidatePath(`/admin/families/${id}`);

    return new Response(null, { status: 204 });
  } catch (error) {
    const { id } = await params;
    return handleApiError(error, `Не удалось архивировать семью ${id}`);
  }
} 