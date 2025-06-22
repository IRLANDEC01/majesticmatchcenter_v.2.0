import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/handle-api-error';
import {
  createTournamentTemplateSchema,
  getTournamentTemplatesSchema,
} from '@/lib/api/schemas/tournament-templates/tournament-template-schemas';
import { tournamentTemplateService } from '@/lib/domain/tournament-templates/tournament-template-service';

/**
 * GET handler for fetching tournament templates.
 * @param {Request} request
 * @returns {Promise<NextResponse>}
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const validationResult = getTournamentTemplatesSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const templates = await tournamentTemplateService.getAllTemplates(validationResult.data);

    return NextResponse.json(templates);
  } catch (error) {
    return handleApiError(error, 'Failed to get tournament templates');
  }
}

/**
 * POST handler for creating a new tournament template.
 * @param {Request} request
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  try {
    const json = await request.json();

    const validationResult = createTournamentTemplateSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const newTemplate = await tournamentTemplateService.createTemplate(validationResult.data);
    
    revalidatePath('/admin/tournament-templates');

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create tournament template');
  }
}