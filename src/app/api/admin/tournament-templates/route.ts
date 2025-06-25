import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createTournamentTemplateSchema.parse(body);
    const newTemplate = await tournamentTemplateService.createTournamentTemplate(data);

    revalidatePath('/admin/tournament-templates');

    // Возвращаем созданный объект, обернутый в `data`, и статус 201
    return NextResponse.json({ data: newTemplate }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return handleApiError(error);
    }
    return handleApiError(new Error(String(error)));
  }
} 