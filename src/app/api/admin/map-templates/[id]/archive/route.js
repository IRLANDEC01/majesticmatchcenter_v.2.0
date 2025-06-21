import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import MapTemplate from '@/models/map/MapTemplate';
import { handleApiError } from '@/lib/api/handle-api-error';
import mapTemplateRepo from '@/lib/repos/map-templates/map-template-repo';

/**
 * PATCH /api/admin/map-templates/[id]/archive
 * Архивирует или восстанавливает шаблон карты.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    await connectToDatabase();

    // The intent of this endpoint is to archive. No need for a body.
    const updatedTemplate = await mapTemplateRepo.archive(id, true);

    if (!updatedTemplate) {
      return NextResponse.json({ message: 'Map template not found' }, { status: 404 });
    }

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    return handleApiError(error, 'Failed to update map template archive state');
  }
} 