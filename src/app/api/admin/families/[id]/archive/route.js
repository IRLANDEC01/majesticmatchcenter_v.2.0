import { NextResponse } from 'next/server';
import { familyService } from '@/lib/domain/families/family-service';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';

const patchSchema = z.object({
  archived: z.boolean(),
});

/**
 * PATCH /api/admin/families/[id]/archive
 * Архивирует или восстанавливает семью.
 */
export async function PATCH(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;
    const json = await request.json();

    const validationResult = patchSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { archived } = validationResult.data;
    let result;

    if (archived) {
      result = await familyService.archiveFamily(id);
    } else {
      result = await familyService.unarchiveFamily(id);
    }

    if (!result) {
      return NextResponse.json({ message: `Family with id ${id} not found.` }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to update family archive state:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
} 