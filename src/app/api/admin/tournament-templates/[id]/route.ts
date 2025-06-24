import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { tournamentTemplateUpdateSchema } from '@/lib/api/schemas/tournament-templates/tournament-template-schemas';
import tournamentTemplateService from '@/lib/domain/tournament-templates/tournament-template-service';
import { handleApiError } from '@/lib/api/handle-api-error';

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
    return handleApiError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Обновляет существующий шаблон турнира.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = params;
    const body = await request.json();
    const validation = tournamentTemplateUpdateSchema.safeParse(body);

    if (!validation.success) {
      return new Response(JSON.stringify({ errors: validation.error.flatten().fieldErrors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updatedTemplate = await tournamentTemplateService.updateTournamentTemplate(id, validation.data);

    revalidatePath('/admin/tournament-templates');
    revalidatePath(`/admin/tournament-templates/${id}`);

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    return handleApiError(error instanceof Error ? error : new Error(String(error)));
  }
}