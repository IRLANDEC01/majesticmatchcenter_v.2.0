import { NextResponse } from 'next/server';
import { tournamentTemplateService } from '@/lib/domain/tournament-templates/tournament-template-service';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';

const patchSchema = z.object({
  archived: z.boolean(),
});

/**
 * PATCH /api/admin/tournament-templates/[id]/archive
 * Архивирует или восстанавливает шаблон турнира.
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
      result = await tournamentTemplateService.archiveTemplate(id);
    } else {
      result = await tournamentTemplateService.unarchiveTemplate(id);
    }

    if (!result) {
      return NextResponse.json({ message: `Tournament Template with id ${id} not found.` }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to update tournament template archive state:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
} 