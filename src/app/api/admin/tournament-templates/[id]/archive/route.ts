import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/handle-api-error';
import tournamentTemplateService from '@/lib/domain/tournament-templates/tournament-template-service';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = params;
    const archivedTemplate = await tournamentTemplateService.archiveTournamentTemplate(id);

    revalidatePath('/admin/tournament-templates');

    return NextResponse.json(archivedTemplate);
  } catch (error) {
    return handleApiError(error instanceof Error ? error : new Error(String(error)), 'Не удалось архивировать шаблон турнира');
  }
} 