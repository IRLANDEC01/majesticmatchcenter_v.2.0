import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import familyService from '@/lib/domain/families/family-service.js';
import { handleApiError } from '@/lib/api/handle-api-error.js';
import { familyParamsSchema, changeOwnerSchema } from '@/lib/api/schemas/families/family-schemas.js';

/**
 * PATCH /api/admin/families/[id]/owner
 * Изменяет владельца семьи.
 */
export async function PATCH(request, { params }) {
  try {
    const { id: familyId } = familyParamsSchema.parse(params);
    const body = await request.json();
    const { newOwnerId } = changeOwnerSchema.parse(body);

    const updatedFamily = await familyService.changeOwner(familyId, newOwnerId);

    revalidatePath('/admin/families');
    revalidatePath(`/admin/families/${familyId}`);

    return NextResponse.json(updatedFamily);
  } catch (error) {
    return handleApiError(error, `Не удалось сменить владельца для семьи ${params.id}`);
  }
} 