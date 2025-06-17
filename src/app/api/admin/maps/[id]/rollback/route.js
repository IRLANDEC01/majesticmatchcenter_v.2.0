import { NextResponse } from 'next/server';
import { mapService } from '@/lib/domain/maps/map-service';
import { handleApiError } from '@/lib/api/handle-api-error';

export async function POST(request, { params }) {
  try {
    const { id: mapId } = params;

    const rolledBackMap = await mapService.rollbackMapCompletion(mapId);

    return NextResponse.json(rolledBackMap, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
} 