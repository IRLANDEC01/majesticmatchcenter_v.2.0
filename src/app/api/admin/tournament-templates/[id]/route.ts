import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/handle-api-error';
import { updateTournamentTemplateSchema } from '@/lib/api/schemas/tournament-templates/tournament-template-schemas';
import tournamentTemplateService from '@/lib/domain/tournament-templates/tournament-template-service';

type RouteContext = {
  params: { id: string; };
};

/**
 * Получает один шаблон турнира по ID.
 */
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = params;
    const template = await tournamentTemplateService.getTournamentTemplateById(id);
    return NextResponse.json(template);
  } catch (error) {
    return handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      `Не удалось получить шаблон турнира ${params.id}`
    );
  }
}

/**
 * Обновляет существующий шаблон турнира.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = params;
    const body = await request.json();

    const validationResult = updateTournamentTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const updatedTemplate = await tournamentTemplateService.updateTournamentTemplate(id, validationResult.data);

    revalidatePath('/admin/tournament-templates');
    revalidatePath(`/admin/tournament-templates/edit/${updatedTemplate.slug}`);

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    return handleApiError(
      error instanceof Error ? error : new Error(String(error)),
      'Не удалось обновить шаблон турнира'
    );
  }
}