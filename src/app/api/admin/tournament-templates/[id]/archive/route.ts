import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/handle-api-error';
import tournamentTemplateService from '@/lib/domain/tournament-templates/tournament-template-service';

type RouteContext = {
  params: {
    id: string;
  };
};

/**
 * Архивирует шаблон турнира.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const archivedTemplate = await tournamentTemplateService.archiveTournamentTemplate(params.id);
    revalidatePath('/admin/tournament-templates');
    return NextResponse.json({ data: archivedTemplate });
  } catch (error) {
    if (error instanceof Error) {
      return handleApiError(error);
    }
    return handleApiError(new Error(String(error)));
  }
} 