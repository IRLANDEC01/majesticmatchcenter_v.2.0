import { NextResponse } from 'next/server';
import { tournamentTemplateService } from '@/lib/domain/tournament-templates/tournament-template-service';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import { tournamentTemplateRepo } from '@/lib/repos/tournament-templates/tournament-template-repo';
import { handleApiError } from '@/lib/api/handle-api-error';

const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Название не может быть пустым.').optional(),
  description: z.string().optional(),
  mapTemplates: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID шаблона карты')).optional(),
});

/**
 * PUT /api/admin/tournament-templates/[id]
 * Обновляет существующий шаблон турнира.
 */
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ message: 'Некорректный ID шаблона' }, { status: 400 });
    }

    await connectToDatabase();
    const json = await request.json();

    const validationResult = updateTemplateSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const updatedTemplate = await tournamentTemplateRepo.update(params.id, validationResult.data);

    if (!updatedTemplate) {
      return NextResponse.json({ message: 'Шаблон турнира не найден' }, { status: 404 });
    }

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    return handleApiError(error);
  }
} 