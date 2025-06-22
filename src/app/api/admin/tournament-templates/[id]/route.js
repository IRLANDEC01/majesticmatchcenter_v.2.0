import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/handle-api-error';
import { updateTournamentTemplateSchema } from '@/lib/api/schemas/tournament-templates/tournament-template-schemas';
import { tournamentTemplateService } from '@/lib/domain/tournament-templates/tournament-template-service';

/**
 * GET handler for fetching a single tournament template by ID.
 * @param {Request} request
 * @param {{ params: { id: string } }} context
 * @returns {Promise<NextResponse>}
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const template = await tournamentTemplateService.getTemplateById(id);
    return NextResponse.json(template);
  } catch (error) {
    return handleApiError(error, `Failed to get tournament template ${params.id}`);
  }
}

/**
 * PATCH handler for updating a tournament template.
 * @param {Request} request
 * @param {{ params: { id: string } }} context
 * @returns {Promise<NextResponse>}
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const json = await request.json();

    const validationResult = updateTournamentTemplateSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const updatedTemplate = await tournamentTemplateService.updateTemplate(id, validationResult.data);

    revalidatePath('/admin/tournament-templates');
    revalidatePath(`/admin/tournament-templates/${id}`);

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    return handleApiError(error, `Failed to update tournament template ${params.id}`);
  }
}