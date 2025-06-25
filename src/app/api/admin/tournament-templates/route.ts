import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/handle-api-error';
import tournamentTemplateService from '@/lib/domain/tournament-templates/tournament-template-service';
import {
  createTournamentTemplateSchema,
  getTournamentTemplatesSchema,
} from '@/lib/api/schemas/tournament-templates/tournament-template-schemas';

/**
 * Получает список шаблонов турниров с пагинацией, фильтрацией и поиском.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validationResult = getTournamentTemplatesSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const result = await tournamentTemplateService.getTournamentTemplates(validationResult.data);

    return NextResponse.json(result);
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