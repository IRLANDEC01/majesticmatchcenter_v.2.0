import { NextResponse } from 'next/server';
import { familyService } from '@/lib/domain/families/family-service';
import { handleApiError } from '@/lib/api/handle-api-error';
import { z } from 'zod';

const changeOwnerSchema = z.object({
  newOwnerId: z.string({ required_error: 'ID нового владельца является обязательным.' }),
});

/**
 * PATCH /api/admin/families/[id]/owner
 * Изменяет владельца семьи.
 */
export async function PATCH(request, { params }) {
  try {
    const { id: familyId } = params;
    const json = await request.json();

    const validationResult = changeOwnerSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const { newOwnerId } = validationResult.data;

    const updatedFamily = await familyService.changeOwner(familyId, newOwnerId);

    return NextResponse.json(updatedFamily);
  } catch (error) {
    return handleApiError(error);
  }
} 