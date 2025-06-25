import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/handle-api-error';
import tournamentTemplateService from '@/lib/domain/tournament-templates/tournament-template-service';

/**
 * Восстанавливает шаблон турнира из архива.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const restoredTemplate = await tournamentTemplateService.restoreTournamentTemplate(
      params.id
    );
    revalidatePath('/admin/tournament-templates');
    return NextResponse.json({ data: restoredTemplate });
  } catch (error) {
    if (error instanceof Error) {
      return handleApiError(error);
    }
    return handleApiError(new Error(String(error)));
  }
}