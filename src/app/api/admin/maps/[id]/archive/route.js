import { NextResponse } from 'next/server';
import { mapService } from '@/lib/domain/maps/map-service';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';

const patchSchema = z.object({
  archived: z.boolean(),
});

/**
 * PATCH /api/admin/maps/[id]/archive
 * Архивирует или восстанавливает карту.
 */
export async function PATCH(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;
    const json = request.body || await request.json();

    const validationResult = patchSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { archived } = validationResult.data;
    let result;

    if (archived) {
      result = await mapService.archiveMap(id);
    } else {
      result = await mapService.unarchiveMap(id);
    }

    if (!result) {
      return NextResponse.json({ message: `Map with id ${id} not found.` }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to update map archive state:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
} 