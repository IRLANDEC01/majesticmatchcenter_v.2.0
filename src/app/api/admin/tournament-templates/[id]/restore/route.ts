import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/handle-api-error';
import tournamentTemplateService from '@/lib/domain/tournament-templates/tournament-template-service';
import type { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';

/**
 * Восстанавливает шаблон турнира из архива.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const restoredTemplate = await tournamentTemplateService.restoreTournamentTemplate(params.id);
    revalidatePath('/admin/tournament-templates');
    revalidatePath(`/admin/tournament-templates/${params.id}`);
    return NextResponse.json({ data: restoredTemplate });
  } catch (error) {
    if (error instanceof Error) {
      return handleApiError(error);
    }
    return handleApiError(new Error('An unknown error occurred during restoring'));
  }
}