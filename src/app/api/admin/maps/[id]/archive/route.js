import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/handle-api-error';
import container from '@/lib/di-container';

const mapService = container.get('mapService');

/**
 * PATCH /api/admin/maps/[id]/archive
 * Архивирует или восстанавливает карту.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const { archived } = await request.json();
    let result;
    if (archived) {
      result = await mapService.archiveMap(id);
    } else {
      result = await mapService.unarchiveMap(id);
    }
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
} 