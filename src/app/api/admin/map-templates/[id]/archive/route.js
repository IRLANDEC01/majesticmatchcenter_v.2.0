import { NextResponse } from 'next/server';
import { mapTemplateService } from '@/lib/domain/map-templates/map-template-service';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';

const patchSchema = z.object({
  archived: z.boolean(),
});

/**
 * PATCH /api/admin/map-templates/[id]/archive
 * Архивирует или восстанавливает шаблон карты.
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
      result = await mapTemplateService.archiveMapTemplate(id);
    } else {
      result = await mapTemplateService.unarchiveMapTemplate(id);
    }

    if (!result) {
      return NextResponse.json({ message: `Map Template with id ${id} not found.` }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to update map template archive state:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
} 