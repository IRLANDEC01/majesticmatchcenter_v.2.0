import { NextResponse } from 'next/server';
import { tournamentTemplateService } from '@/lib/domain/tournament-templates/tournament-template-service';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';

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

    const updatedTemplate = await tournamentTemplateService.updateTemplate(id, validationResult.data);

    if (!updatedTemplate) {
      return NextResponse.json({ message: 'Шаблон турнира не найден' }, { status: 404 });
    }

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error(`Failed to update tournament template ${params.id}:`, error);
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Шаблон турнира с таким названием уже существует' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Ошибка сервера при обновлении шаблона турнира' }, { status: 500 });
  }
} 