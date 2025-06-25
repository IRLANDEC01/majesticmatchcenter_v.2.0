import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
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
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const template = await tournamentTemplateService.getTournamentTemplateById(params.id);
    return NextResponse.json({ data: template });
  } catch (error) {
    if (error instanceof Error) {
      return handleApiError(error);
    }
    return new Response(JSON.stringify({ errors: { global: [String(error)] } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Обновляет существующий шаблон турнира.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const data = tournamentTemplateUpdateSchema.parse(body);
    const updatedTemplate = await tournamentTemplateService.updateTournamentTemplate(params.id, data);

    revalidatePath('/admin/tournament-templates');
    revalidatePath(`/admin/tournament-templates/${params.id}`);

    return NextResponse.json({ data: updatedTemplate });
  } catch (error) {
    if (error instanceof Error) {
      return handleApiError(error);
    }
    return new Response(JSON.stringify({ errors: { global: [String(error)] } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}