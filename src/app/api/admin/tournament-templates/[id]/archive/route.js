import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/handle-api-error';
import { tournamentTemplateService } from '@/lib/domain/tournament-templates/tournament-template-service';

/**
 * PATCH /api/admin/tournament-templates/[id]/archive
 * Архивирует или восстанавливает шаблон турнира.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const { archived } = await request.json();

    let result;
    if (archived) {
      result = await tournamentTemplateService.archiveTemplate(id);
    } else {
      result = await tournamentTemplateService.unarchiveTemplate(id);
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'Failed to update tournament template archive state');
  }
} 