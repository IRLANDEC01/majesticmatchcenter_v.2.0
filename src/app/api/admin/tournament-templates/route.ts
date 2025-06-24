import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/handle-api-error';
import tournamentTemplateService from '@/lib/domain/tournament-templates/tournament-template-service';
import { createTournamentTemplateSchema } from '@/lib/api/schemas/tournament-templates/tournament-template-schemas';

// Схема для валидации query-параметров GET-запроса.
// Находится здесь, а не в общем файле, т.к. специфична для этого маршрута.
const getParamsSchema = z.object({
  includeArchived: z.preprocess((val) => String(val).toLowerCase() === 'true', z.boolean()).optional().default(false),
});

/**
 * Получает список шаблонов турниров.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const validationResult = getParamsSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { includeArchived } = validationResult.data;
    const templates = await tournamentTemplateService.getTournamentTemplates(includeArchived);

    return NextResponse.json(templates);
  } catch (error) {
    return handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      'Не удалось получить список шаблонов турниров'
    );
  }
}

/**
 * Создает новый шаблон турнира.
 */
export async function POST(request: Request) {
  try {
    const json = await request.json();

    const validationResult = createTournamentTemplateSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const newTemplate = await tournamentTemplateService.createTournamentTemplate(validationResult.data);
    
    revalidatePath('/admin/tournament-templates');

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    return handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      'Не удалось создать шаблон турнира'
    );
  }
} 