import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import familyService from '@/lib/domain/families/family-service.js';
import { handleApiError } from '@/lib/api/handle-api-error.js';
import { familyParamsSchema } from '@/lib/api/schemas/families/family-schemas.js';

/**
 * PATCH /api/admin/families/[id]/archive
 * Архивирует семью.
 */
export async function PATCH(request, { params }) {
  try {
    const awaitedParams = await params;
    const { id } = familyParamsSchema.parse(awaitedParams);
    const result = await familyService.archiveFamily(id);

    revalidatePath('/admin/families');
    revalidatePath(`/admin/families/${id}`);

    return NextResponse.json(result);
  } catch (error) {
    const { id } = await params;
    return handleApiError(error, `Не удалось архивировать семью ${id}`);
  }
} 