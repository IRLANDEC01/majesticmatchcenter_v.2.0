import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/handle-api-error';
import { revalidatePath } from 'next/cache';
import tournamentTemplateService from '@/lib/domain/tournament-templates/tournament-template-service';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const restoredTemplate = await tournamentTemplateService.restoreTournamentTemplate(params.id);

    revalidatePath('/admin/tournament-templates');

    return NextResponse.json(restoredTemplate);
  } catch (error) {
    return handleApiError(error instanceof Error ? error : new Error(String(error)), 'Не удалось восстановить шаблон турнира');
  }
} 